import { Prisma } from "../../generated/prisma/client.js";
import { SourceStatus, SourceType } from "../../generated/prisma/enums.js";
import { RAG_MIN_SCORE, RAG_TOP_K } from "../../lib/ai-config.js";
import { TextChunk } from "../../lib/chunking.js";
import { prisma } from "../../lib/prisma.js";
import { toPgVector } from "../../lib/vector.js";
import { ChunkSearchHit } from "./source.types.js";
import {
  CreatePdfSource,
  CreateSource,
  CreateWebsiteSource,
  CreateYoutubeSource,
  ListSourcesQuery,
} from "./source.types.js";

export async function getSourcesByWorkspaceId(
  workspaceId: string,
  filters: ListSourcesQuery,
) {
  const sources = await prisma.source.findMany({
    where: {
      workspaceId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.q && { title: { contains: filters.q, mode: "insensitive" } }),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      error: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  return sources;
}

export async function createSourceInWorkspace(
  workspaceId: string,
  data: CreateSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: data.type,
      title: data.title,
      source: data.content,
      status: SourceStatus.PENDING,
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      error: true,
    },
  });
  return source;
}

export async function createWebsiteSourceInWorkspace(
  workspaceId: string,
  data: CreateWebsiteSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: SourceType.WEBSITE,
      title: data.title,
      source: data.content,
      url: data.url,
      status: SourceStatus.PENDING,
      metadata: {
        importedFrom: data.metadata?.importedFrom ?? data.url,
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      error: true,
    },
  });
  return source;
}

export async function createYoutubeSourceInWorkspace(
  workspaceId: string,
  data: CreateYoutubeSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: SourceType.YOUTUBE,
      title: data.title,
      source: data.content,
      url: data.url,
      status: SourceStatus.PENDING,
      metadata: {
        importedFrom: data.metadata?.importedFrom ?? data.url,
        ...(data.metadata?.videoId ? { videoId: data.metadata.videoId } : {}),
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      error: true,
    },
  });
  return source;
}

export async function createPdfSourceInWorkspace(
  workspaceId: string,
  data: CreatePdfSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: SourceType.PDF,
      title: data.title,
      fileUrl: data.fileUrl,
      source: data.content,
      status: SourceStatus.PENDING,
      metadata: data.metadata ?? {},
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      error: true,
    },
  });
  return source;
}

function metadataForClient(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return metadata;
  }
  if (!("pages" in metadata)) {
    return metadata;
  }
  const { pages: _pages, ...rest } = metadata;
  return rest;
}

export async function getSource(workspaceId: string, sourceId: string) {
  const source = await prisma.source.findFirst({
    where: {
      workspaceId,
      id: sourceId,
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      error: true,
      source: true,
      url: true,
      fileUrl: true,
      metadata: true,
    },
  });
  if (!source) {
    return null;
  }
  return { ...source, metadata: metadataForClient(source.metadata) };
}

export async function getSourceJobState(workspaceId: string, sourceId: string) {
  const source = await prisma.source.findFirst({
    where: { workspaceId, id: sourceId },
    select: {
      id: true,
      type: true,
      status: true,
      fileUrl: true,
      url: true,
      metadata: true,
    },
  });
  if (!source) {
    return null;
  }
  return { ...source, metadata: metadataForClient(source.metadata) };
}

export async function getSourceContent(workspaceId: string, sourceId: string) {
  return prisma.source.findFirst({
    where: { workspaceId, id: sourceId },
    select: { source: true, metadata: true },
  });
}

export async function saveSourceExtract(
  workspaceId: string,
  sourceId: string,
  data: {
    source: string;
    url?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: {
      source: data.source,
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
    select: { id: true },
  });
}

export async function updateSourceMetadata(
  workspaceId: string,
  sourceId: string,
  metadata: Prisma.InputJsonValue,
) {
  await prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: { metadata },
    select: { id: true },
  });
}

export async function updateSourceStatus(
  workspaceId: string,
  sourceId: string,
  status: SourceStatus,
) {
  return prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: { status, error: null },
    select: { id: true, status: true },
  });
}

export async function completeSource(
  workspaceId: string,
  sourceId: string,
  data: {
    source?: string;
    url?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: {
      status: SourceStatus.COMPLETED,
      error: null,
      ...(data.source !== undefined ? { source: data.source } : {}),
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
    select: { id: true },
  });
}

export async function failSource(
  workspaceId: string,
  sourceId: string,
  error: string,
) {
  return prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: { status: SourceStatus.FAILED, error },
  });
}

export async function deleteSourceInWorkspace(
  workspaceId: string,
  sourceId: string,
) {
  const source = await prisma.source.delete({
    where: {
      workspaceId,
      id: sourceId,
    },
    select: {
      fileUrl: true,
    },
  });
  return source;
}

export async function findSourcesForReprocess(
  workspaceId: string,
  sourceIds: string[],
) {
  return prisma.source.findMany({
    where: { workspaceId, id: { in: sourceIds } },
    select: { id: true },
  });
}

export async function resetSourcesForReprocess(
  workspaceId: string,
  sourceIds: string[],
) {
  return prisma.source.updateMany({
    where: { workspaceId, id: { in: sourceIds } },
    data: { status: SourceStatus.PENDING, error: null },
  });
}

export async function findSourcesForDelete(
  workspaceId: string,
  sourceIds: string[],
) {
  return prisma.source.findMany({
    where: { workspaceId, id: { in: sourceIds } },
    select: { id: true, fileUrl: true },
  });
}

export async function deleteManySourcesInWorkspace(
  workspaceId: string,
  sourceIds: string[],
) {
  return prisma.source.deleteMany({
    where: { workspaceId, id: { in: sourceIds } },
  });
}

export async function replaceSourceChunks(
  sourceId: string,
  chunks: TextChunk[],
  embeddings: number[][],
): Promise<number> {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunk count ${chunks.length} did not match embedding count ${embeddings.length}`,
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.sourceChunk.deleteMany({ where: { sourceId } });
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        if (!chunk || !embedding) {
          throw new Error(`Missing chunk or embedding at index ${i}`);
        }
        await tx.$executeRaw`
          INSERT INTO "SourceChunk" (
            id,
            "sourceId",
            index,
            content,
            metadata,
            embedding
          )
          VALUES (
            ${crypto.randomUUID()},
            ${sourceId},
            ${chunk.index},
            ${chunk.content},
            ${JSON.stringify(chunk.metadata ?? {})}::jsonb,
            ${toPgVector(embedding)}::vector
          )
        `;
      }
    },
    { timeout: 60_000 },
  );

  return chunks.length;
}

const SEARCH_SNIPPET_LENGTH = 240;

export async function searchChunks(
  workspaceId: string,
  embedding: number[],
  sourceIds?: string[],
): Promise<ChunkSearchHit[]> {
  if (sourceIds && sourceIds.length === 0) {
    return [];
  }

  const vector = toPgVector(embedding);
  const maxDistance = 1 - RAG_MIN_SCORE;
  const sourceFilter = sourceIds
    ? Prisma.sql`AND s.id IN (${Prisma.join(sourceIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    {
      chunkId: string;
      sourceId: string;
      sourceTitle: string;
      index: number;
      page: number | null;
      snippet: string;
      score: number;
    }[]
  >`
    SELECT
      c.id AS "chunkId",
      s.id AS "sourceId",
      s.title AS "sourceTitle",
      c."index" AS "index",
      CASE
        WHEN jsonb_typeof(c.metadata->'page') = 'number'
        THEN (c.metadata->>'page')::int
        ELSE NULL
      END AS page,
      left(c.content, ${SEARCH_SNIPPET_LENGTH}) AS snippet,
      (1 - (c.embedding <=> ${vector}::vector))::float8 AS score
    FROM "SourceChunk" c
    JOIN "Source" s ON s.id = c."sourceId"
    WHERE s."workspaceId" = ${workspaceId}
      AND s.status = 'COMPLETED'::"SourceStatus"
      AND c.embedding IS NOT NULL
      AND (c.embedding <=> ${vector}::vector) <= ${maxDistance}
      ${sourceFilter}
    ORDER BY c.embedding <=> ${vector}::vector
    LIMIT ${RAG_TOP_K}
  `;

  return rows.map((row) => ({
    chunkId: row.chunkId,
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle,
    index: Number(row.index),
    page: row.page === null ? null : Number(row.page),
    snippet: row.snippet,
    score: Number(row.score),
  }));
}