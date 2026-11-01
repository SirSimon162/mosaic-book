-- pgvector ships with the pgvector/pgvector image, not with stock postgres.
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "SourceChunk" ADD COLUMN "embedding" vector(1536);
