import { NonRetriableError } from "inngest";
import { Prisma } from "../generated/prisma/client.js";
import { SourceStatus, SourceType } from "../generated/prisma/enums.js";
import { inngest } from "../lib/inngest.js";
import { EmptyWebsiteError, scrapeWebsite } from "../lib/firecrawl.js";
import { EmptyPdfError, extractPdfFromCloudinary } from "../lib/pdf.js";
import { EmptyYoutubeError, fetchYoutubeTranscript } from "../lib/youtube.js";
import {
  completeSource,
  failSource,
  getSourceContent,
  getSourceJobState,
  replaceSourceChunks,
  saveSourceExtract,
  updateSourceMetadata,
  updateSourceStatus,
} from "../modules/source/source.repository.js";
import { chunkPages, chunkText, type TextChunk } from "../lib/chunking.js";
import {
  EmbeddingConfigError,
  embedTexts,
  isPermanentOpenAIError,
} from "../lib/openai.js";

type ProcessSourceEvent = {
  sourceId: string;
  workspaceId: string;
};

function metadataRecord(
  metadata: Prisma.JsonValue | null,
): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...(metadata as Record<string, unknown>) };
  }
  return {};
}

function readPages(metadata: Prisma.JsonValue | null) {
  const pages = metadataRecord(metadata).pages;
  if (!Array.isArray(pages)) {
    return null;
  }
  const text = pages.filter((page): page is string => typeof page === "string");
  return text.length > 0 ? text : null;
}

function publicIdFromMetadata(
  metadata: Prisma.JsonValue | null,
): { publicId: string } | Record<string, never> {
  const record = metadataRecord(metadata);
  return typeof record.publicId === "string" && record.publicId.length > 0
    ? { publicId: record.publicId }
    : {};
}

async function persistChunks(sourceId: string, chunks: TextChunk[]) {
  if (chunks.length === 0) {
    throw new NonRetriableError("No chunks produced");
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  } catch (error) {
    if (
      error instanceof EmbeddingConfigError ||
      isPermanentOpenAIError(error)
    ) {
      throw new NonRetriableError(
        error instanceof Error ? error.message : "Failed to embed chunks",
        { cause: error },
      );
    }
    throw error;
  }

  const count = await replaceSourceChunks(sourceId, chunks, embeddings);
  return { count };
}

const MAX_SOURCE_ERROR_LENGTH = 300;

function failureMessage(message: string | undefined) {
  const firstLine = message
    ?.split("\n")[0]
    ?.replace(/^NonRetriableError:\s*/i, "")
    .trim();
  if (!firstLine) {
    return "Processing failed";
  }
  return firstLine.slice(0, MAX_SOURCE_ERROR_LENGTH);
}

async function markFailed(
  data: ProcessSourceEvent | undefined,
  message: string | undefined,
) {
  if (!data?.sourceId || !data.workspaceId) {
    return;
  }
  await failSource(
    data.workspaceId,
    data.sourceId,
    failureMessage(message),
  ).catch(() => undefined);
}

export const processSource = inngest.createFunction(
  {
    id: "process-source",
    retries: 3,
    concurrency: { key: "event.data.sourceId", limit: 1 },
    triggers: [{ event: "source/process.requested" }],
    onFailure: async ({ error, event }) => {
      await markFailed(
        event.data.event.data as ProcessSourceEvent,
        error instanceof Error ? error.message : undefined,
      );
    },
  },
  async ({ event, step }) => {
    const { sourceId, workspaceId } = event.data as ProcessSourceEvent;

    const source = await step.run("load-source", () =>
      getSourceJobState(workspaceId, sourceId),
    );

    if (!source) {
      throw new NonRetriableError("Source not found");
    }

    if (source.status === SourceStatus.COMPLETED) {
      return { skipped: true };
    }

    await step.run("mark-processing", async () => {
      await updateSourceStatus(workspaceId, sourceId, SourceStatus.PROCESSING);
      return { status: SourceStatus.PROCESSING };
    });

    if (source.type === SourceType.PDF) {
      if (!source.fileUrl) {
        throw new NonRetriableError("PDF source is missing fileUrl");
      }

      const fileUrl = source.fileUrl;
      const pageCount = await step.run("extract-pdf", async () => {
        try {
          const extracted = await extractPdfFromCloudinary({
            fileUrl,
            ...publicIdFromMetadata(source.metadata),
          });
          await saveSourceExtract(workspaceId, sourceId, {
            source: extracted.text,
            metadata: {
              ...metadataRecord(source.metadata),
              pages: extracted.pages,
              pageCount: extracted.pageCount,
            },
          });
          return extracted.pageCount;
        } catch (error) {
          if (error instanceof EmptyPdfError) {
            throw new NonRetriableError(error.message, { cause: error });
          }
          throw error;
        }
      });

      await step.run("chunk", async () => {
        const stored = await getSourceContent(workspaceId, sourceId);
        const pages = readPages(stored?.metadata ?? null);
        if (!pages) {
          throw new NonRetriableError("PDF extract is missing pages");
        }
        const result = await persistChunks(sourceId, chunkPages(pages));
        const metadata = metadataRecord(stored?.metadata ?? null);
        delete metadata.pages;
        await updateSourceMetadata(
          workspaceId,
          sourceId,
          metadata as Prisma.InputJsonValue,
        );
        return result;
      });

      await step.run("save", async () => {
        await completeSource(workspaceId, sourceId, {
          metadata: {
            ...metadataRecord(source.metadata),
            pageCount,
          },
        });
        return { pageCount };
      });

      return { pageCount };
    }

    if (source.type === SourceType.WEBSITE) {
      if (!source.url) {
        throw new NonRetriableError("Website source is missing url");
      }

      const url = source.url;
      const saved = await step.run("scrape-website", async () => {
        try {
          const scraped = await scrapeWebsite(url);
          await saveSourceExtract(workspaceId, sourceId, {
            source: scraped.markdown,
            url: scraped.sourceUrl,
            metadata: {
              ...metadataRecord(source.metadata),
              importedFrom: scraped.sourceUrl,
            },
          });
          return { sourceUrl: scraped.sourceUrl };
        } catch (error) {
          if (error instanceof EmptyWebsiteError) {
            throw new NonRetriableError(error.message, { cause: error });
          }
          throw error;
        }
      });

      await step.run("chunk", async () => {
        const stored = await getSourceContent(workspaceId, sourceId);
        if (!stored?.source) {
          throw new NonRetriableError("Website source is missing content");
        }
        return persistChunks(sourceId, chunkText(stored.source));
      });

      await step.run("save", async () => {
        await completeSource(workspaceId, sourceId, {
          url: saved.sourceUrl,
          metadata: {
            ...metadataRecord(source.metadata),
            importedFrom: saved.sourceUrl,
          },
        });
        return { sourceUrl: saved.sourceUrl };
      });

      return { sourceUrl: saved.sourceUrl };
    }

    if (source.type === SourceType.YOUTUBE) {
      if (!source.url) {
        throw new NonRetriableError("YouTube source is missing url");
      }

      const url = source.url;
      const saved = await step.run("fetch-transcript", async () => {
        try {
          const transcript = await fetchYoutubeTranscript(url);
          await saveSourceExtract(workspaceId, sourceId, {
            source: transcript.text,
            url: transcript.sourceUrl,
            metadata: {
              ...metadataRecord(source.metadata),
              importedFrom: transcript.sourceUrl,
              videoId: transcript.videoId,
            },
          });
          return {
            sourceUrl: transcript.sourceUrl,
            videoId: transcript.videoId,
          };
        } catch (error) {
          if (error instanceof EmptyYoutubeError) {
            throw new NonRetriableError(error.message, { cause: error });
          }
          throw error;
        }
      });

      await step.run("chunk", async () => {
        const stored = await getSourceContent(workspaceId, sourceId);
        if (!stored?.source) {
          throw new NonRetriableError("YouTube source is missing content");
        }
        return persistChunks(sourceId, chunkText(stored.source));
      });

      await step.run("save", async () => {
        await completeSource(workspaceId, sourceId, {
          url: saved.sourceUrl,
          metadata: {
            ...metadataRecord(source.metadata),
            importedFrom: saved.sourceUrl,
            videoId: saved.videoId,
          },
        });
        return { sourceUrl: saved.sourceUrl };
      });

      return { sourceUrl: saved.sourceUrl };
    }

    if (
      source.type === SourceType.TEXT ||
      source.type === SourceType.MARKDOWN
    ) {
      await step.run("chunk", async () => {
        const stored = await getSourceContent(workspaceId, sourceId);
        if (!stored?.source) {
          throw new NonRetriableError(
            `${source.type} source is missing content`,
          );
        }
        return persistChunks(sourceId, chunkText(stored.source));
      });
      await step.run("complete-existing", async () => {
        await completeSource(workspaceId, sourceId, {});
        return { completed: true };
      });
      return { skippedExtract: true };
    }

    throw new NonRetriableError(`Unsupported source type: ${source.type}`);
  },
);
