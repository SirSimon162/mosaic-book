import { NonRetriableError } from "inngest";
import { Prisma } from "../generated/prisma/client.js";
import { SourceStatus, SourceType } from "../generated/prisma/enums.js";
import { inngest } from "../lib/inngest.js";
import { EmptyWebsiteError, scrapeWebsite } from "../lib/firecrawl.js";
import { EmptyPdfError, extractPdfFromCloudinary } from "../lib/pdf.js";
import {
  completeSource,
  failSource,
  getSource,
  updateSourceStatus,
} from "../modules/source/source.repository.js";

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

function publicIdFromMetadata(
  metadata: Prisma.JsonValue | null,
): { publicId: string } | Record<string, never> {
  const record = metadataRecord(metadata);
  return typeof record.publicId === "string" && record.publicId.length > 0
    ? { publicId: record.publicId }
    : {};
}

async function markFailed(data: ProcessSourceEvent | undefined) {
  if (!data?.sourceId || !data.workspaceId) {
    return;
  }
  await failSource(data.workspaceId, data.sourceId).catch(() => undefined);
}

export const processSource = inngest.createFunction(
  {
    id: "process-source",
    retries: 3,
    triggers: [{ event: "source/process.requested" }],
    onFailure: async ({ event }) => {
      await markFailed(event.data.event.data as ProcessSourceEvent);
    },
  },
  async ({ event, step }) => {
    const { sourceId, workspaceId } = event.data as ProcessSourceEvent;

    const source = await step.run("load-source", () =>
      getSource(workspaceId, sourceId),
    );

    if (!source) {
      throw new NonRetriableError("Source not found");
    }

    if (source.status === SourceStatus.COMPLETED) {
      return { skipped: true };
    }

    await step.run("mark-processing", () =>
      updateSourceStatus(workspaceId, sourceId, SourceStatus.PROCESSING),
    );

    if (source.type === SourceType.PDF) {
      if (!source.fileUrl) {
        throw new NonRetriableError("PDF source is missing fileUrl");
      }

      const fileUrl = source.fileUrl;
      const extracted = await step.run("extract-pdf", async () => {
        try {
          return await extractPdfFromCloudinary({
            fileUrl,
            ...publicIdFromMetadata(source.metadata),
          });
        } catch (error) {
          if (error instanceof EmptyPdfError) {
            throw new NonRetriableError(error.message, { cause: error });
          }
          throw error;
        }
      });

      await step.run("save", () =>
        completeSource(workspaceId, sourceId, {
          source: extracted.text,
          metadata: {
            ...metadataRecord(source.metadata),
            pageCount: extracted.pageCount,
          },
        }),
      );

      return { pageCount: extracted.pageCount };
    }

    if (source.type === SourceType.WEBSITE) {
      if (!source.url) {
        throw new NonRetriableError("Website source is missing url");
      }

      const url = source.url;
      const scraped = await step.run("scrape-website", async () => {
        try {
          return await scrapeWebsite(url);
        } catch (error) {
          if (error instanceof EmptyWebsiteError) {
            throw new NonRetriableError(error.message, { cause: error });
          }
          throw error;
        }
      });

      await step.run("save", () =>
        completeSource(workspaceId, sourceId, {
          source: scraped.markdown,
          url: scraped.sourceUrl,
          metadata: {
            ...metadataRecord(source.metadata),
            importedFrom: scraped.sourceUrl,
          },
        }),
      );

      return { sourceUrl: scraped.sourceUrl };
    }

    throw new NonRetriableError(`Unsupported source type: ${source.type}`);
  },
);
