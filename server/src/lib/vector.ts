import { EMBEDDING_DIMENSIONS } from "./ai-config.js";
import { prisma } from "./prisma.js";

const INDEX_NAME = "SourceChunk_embedding_hnsw_idx";
const ACCESS_METHOD = "hnsw";
const OPERATOR_CLASS = "vector_cosine_ops";

type IndexStatus = {
  ready: boolean;
  accessMethod: string;
  operatorClass: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toPgVector(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${values.length}`,
    );
  }
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding values must be finite numbers");
    }
  }
  return `[${values.join(",")}]`;
}

async function assertEmbeddingColumn(): Promise<void> {
  const rows = await prisma.$queryRaw<{ format: string }[]>`
    SELECT format_type(a.atttypid, a.atttypmod) AS format
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'SourceChunk'
      AND a.attname = 'embedding'
      AND NOT a.attisdropped
  `;
  const format = rows[0]?.format;
  const expected = `vector(${EMBEDDING_DIMENSIONS})`;
  if (format !== expected) {
    throw new Error(
      `SourceChunk.embedding is ${format ?? "missing"}, expected ${expected}`,
    );
  }
}

async function readIndexStatus(): Promise<IndexStatus | null> {
  const rows = await prisma.$queryRaw<
    { ready: boolean; access_method: string; operator_class: string }[]
  >`
    SELECT
      (i.indisvalid AND i.indisready) AS ready,
      am.amname AS access_method,
      opc.opcname AS operator_class
    FROM pg_class idx
    JOIN pg_am am ON am.oid = idx.relam
    JOIN pg_index i ON i.indexrelid = idx.oid
    JOIN pg_opclass opc ON opc.oid = i.indclass[0]
    WHERE idx.relname = ${INDEX_NAME}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    ready: Boolean(row.ready),
    accessMethod: row.access_method,
    operatorClass: row.operator_class,
  };
}

export async function createIndex(): Promise<void> {
  await assertEmbeddingColumn();
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "SourceChunk_embedding_hnsw_idx"
    ON "SourceChunk"
    USING hnsw (embedding vector_cosine_ops)
  `;
}

export async function waitForIndexReady(timeoutMs = 30_000): Promise<void> {
  const started = Date.now();
  for (;;) {
    const status = await readIndexStatus();
    if (!status) {
      if (Date.now() - started > timeoutMs) {
        throw new Error(`Vector index "${INDEX_NAME}" was not created`);
      }
    } else if (
      status.accessMethod !== ACCESS_METHOD ||
      status.operatorClass !== OPERATOR_CLASS
    ) {
      throw new Error(
        `Vector index "${INDEX_NAME}" uses ${status.accessMethod} (${status.operatorClass}). Expected ${ACCESS_METHOD} (${OPERATOR_CLASS}).`,
      );
    } else if (status.ready) {
      return;
    } else if (Date.now() - started > timeoutMs) {
      throw new Error(`Vector index "${INDEX_NAME}" is still building`);
    }
    await delay(200);
  }
}

export async function ensureVectorIndex(): Promise<void> {
  await createIndex();
  await waitForIndexReady();
}
