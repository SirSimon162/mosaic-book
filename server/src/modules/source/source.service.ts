import { Request } from "express";
import {
  BulkDeleteSources,
  CreateSource,
  ImportPdf,
  ImportWebsite,
  ImportYouTube,
  ListSourcesQuery,
  ReprocessSources,
  SearchSources,
  chunkSearchHitSchema,
  listSourcesQuerySchema,
  PublicListSources,
  ChunkSearchHit,
  publicListSourcesSchema,
  PublicSource,
  PublicSourceDetail,
  publicSourceDetailSchema,
  publicSourceSchema,
} from "./source.types.js";
import AppError from "../../lib/http-error.js";
import { Status } from "../../lib/http-code.js";
import {
  createPdfSourceInWorkspace,
  createSourceInWorkspace,
  createWebsiteSourceInWorkspace,
  createYoutubeSourceInWorkspace,
  deleteManySourcesInWorkspace,
  deleteSourceInWorkspace,
  findSourcesForDelete,
  findSourcesForReprocess,
  getSource,
  getSourcesByWorkspaceId,
  listWorkspaceVocabDocuments,
  resetSourcesForReprocess,
  searchChunks,
} from "./source.repository.js";
import {
  embedTexts,
  generateHypotheticalPassage,
  generateStepBackQuestion,
} from "../../lib/openai.js";
import { correctQueryAgainstVocab } from "../../lib/query-correct.js";
import { reciprocalRankFusion } from "../../lib/rrf.js";
import { HYDE_ENABLED, STEP_BACK_ENABLED } from "../../lib/ai-config.js";
import { SourceType } from "../../generated/prisma/enums.js";
import { deleteAsset, saveUpload } from "../../lib/cloudinary-config.js";
import { Prisma } from "../../generated/prisma/client.js";
import { enqueueSourceProcessing } from "../../lib/source-events.js";
import { parseYoutubeVideoId, youtubeWatchUrl } from "../../lib/youtube.js";

export function parseListQuery(query: Request["query"]) {
  const parsed = listSourcesQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new AppError("Invalid query parameters", Status.BAD_REQUEST);
  }
  return parsed.data;
}

export async function listSourcesByWorkspaceId(
  workspaceId: string,
  filters: ListSourcesQuery,
): Promise<PublicListSources> {
  const sources = await getSourcesByWorkspaceId(workspaceId, filters);
  return publicListSourcesSchema.parse(sources);
}

export async function createSource(
  workspaceId: string,
  data: CreateSource,
): Promise<PublicSource> {
  const source = await createSourceInWorkspace(workspaceId, data);
  await enqueueSourceProcessing({
    sourceId: source.id,
    workspaceId,
  });
  return publicSourceSchema.parse(source);
}

export async function getSourceById(
  workspaceId: string,
  sourceId: string,
): Promise<PublicSourceDetail> {
  const source = await getSource(workspaceId, sourceId);
  if (!source) {
    throw new AppError("Source not found", Status.NOT_FOUND);
  }
  return publicSourceDetailSchema.parse(source);
}

export async function importWebsiteSource(
  workspaceId: string,
  input: ImportWebsite,
): Promise<PublicSource> {
  const source = await createWebsiteSourceInWorkspace(workspaceId, {
    type: SourceType.WEBSITE,
    title: input.title,
    content: null,
    url: input.url,
    metadata: { importedFrom: input.url },
  });
  await enqueueSourceProcessing({
    sourceId: source.id,
    workspaceId,
  });
  return publicSourceSchema.parse(source);
}

export async function importYoutubeSource(
  workspaceId: string,
  input: ImportYouTube,
): Promise<PublicSource> {
  const videoId = parseYoutubeVideoId(input.url);
  if (!videoId) {
    throw new AppError("Invalid YouTube URL", Status.BAD_REQUEST);
  }
  const source = await createYoutubeSourceInWorkspace(workspaceId, {
    type: SourceType.YOUTUBE,
    title: input.title,
    content: null,
    url: youtubeWatchUrl(videoId),
    metadata: { importedFrom: input.url, videoId },
  });
  await enqueueSourceProcessing({
    sourceId: source.id,
    workspaceId,
  });
  return publicSourceSchema.parse(source);
}

export async function reprocessSources(
  workspaceId: string,
  data: ReprocessSources,
) {
  const sources = await findSourcesForReprocess(workspaceId, data.sourceIds);
  const idsToReprocess = sources.map((source) => source.id);
  if (idsToReprocess.length === 0) {
    return;
  }
  await resetSourcesForReprocess(workspaceId, idsToReprocess);
  await Promise.all(
    idsToReprocess.map((sourceId) =>
      enqueueSourceProcessing({ sourceId, workspaceId }),
    ),
  );
}

export async function importPdfSource(
  workspaceId: string,
  input: ImportPdf,
  file: Express.Multer.File,
): Promise<PublicSource> {
  const uploaded = await saveUpload(file);
  let source;
  try {
    source = await createPdfSourceInWorkspace(workspaceId, {
      type: SourceType.PDF,
      title: input.title,
      content: null,
      fileUrl: uploaded.secureUrl,
      metadata: {
        fileUrl: uploaded.secureUrl,
        fileName: uploaded.originalname,
        fileSize: uploaded.bytes,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  } catch (e) {
    await deleteAsset(uploaded.secureUrl).catch(() => undefined);
    throw e;
  }
  await enqueueSourceProcessing({
    sourceId: source.id,
    workspaceId,
  });
  return publicSourceSchema.parse(source);
}

export async function deleteSource(workspaceId: string, sourceId: string) {
  try {
    const source = await deleteSourceInWorkspace(workspaceId, sourceId);
    if (!!source.fileUrl) {
      await deleteAsset(source.fileUrl).catch(() => undefined);
    }
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new AppError("Source not found", Status.NOT_FOUND);
    }
    throw e;
  }
}

export type WorkspaceSourceSearch = {
  hits: ChunkSearchHit[];
  query: string;
  corrections: { from: string; to: string }[];
};

export async function searchWorkspaceSources(
  workspaceId: string,
  input: SearchSources,
): Promise<WorkspaceSourceSearch> {
  if (input.sourceIds && input.sourceIds.length === 0) {
    return { hits: [], query: input.query, corrections: [] };
  }

 
  const documents = await listWorkspaceVocabDocuments(workspaceId, input.sourceIds);
  const { query, corrections } = correctQueryAgainstVocab(input.query, documents);

  const [hypothetical, stepBack] = await Promise.all([
    HYDE_ENABLED
      ? generateHypotheticalPassage(query).catch(() => null)
      : Promise.resolve(null),
    STEP_BACK_ENABLED
      ? generateStepBackQuestion(query).catch(() => null)
      : Promise.resolve(null),
  ]);

  const embedInputs = [query];
  if (stepBack) embedInputs.push(stepBack);
  if (hypothetical) embedInputs.push(hypothetical);

  const embeddings = await embedTexts(embedInputs);
  if (!embeddings.length || !embeddings[0]) {
    throw new AppError("Failed to embed query", Status.INTERNAL_SERVER_ERROR);
  }

  const hitGroups: ChunkSearchHit[][] = [];
  for (const embedding of embeddings) {
    if (!embedding) continue;
    hitGroups.push(await searchChunks(workspaceId, embedding, input.sourceIds));
  }

  const hits = reciprocalRankFusion(hitGroups);
  return {
    hits: chunkSearchHitSchema.array().parse(hits),
    query,
    corrections,
  };
}

export async function deleteManySources(
  workspaceId: string,
  data: BulkDeleteSources,
) {
  const sources = await findSourcesForDelete(workspaceId, data.sourceIds);
  const idsToDelete = sources.map((source) => source.id);
  await deleteManySourcesInWorkspace(workspaceId, idsToDelete);
  await Promise.all(
    sources
      .filter((s) => !!s.fileUrl)
      .map((s) => deleteAsset(s.fileUrl!).catch(() => undefined)),
  );
}
