import OpenAI, { APIError } from "openai";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./ai-config.js";
import environment from "../config/env.js";

const EMBEDDING_BATCH_SIZE = 64;

let client: OpenAI | null = null;

export class EmbeddingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingConfigError";
  }
}

function embedClient(): OpenAI {
  const apiKey = environment.OPENAI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingConfigError("OPENAI_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

function vectorsFromResponse(
  embeddings: OpenAI.Embedding[],
  expectedCount: number,
): number[][] {
  const ordered = [...embeddings].sort((a, b) => a.index - b.index);
  if (ordered.length !== expectedCount) {
    throw new Error(
      `Embedding response count ${ordered.length} did not match input count ${expectedCount}`,
    );
  }

  return ordered.map((item) => {
    if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new EmbeddingConfigError(
        `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${item.embedding.length}`,
      );
    }
    return item.embedding;
  });
}

export function isPermanentOpenAIError(error: unknown): boolean {
  return (
    error instanceof APIError &&
    typeof error.status === "number" &&
    error.status < 500 &&
    error.status !== 429
  );
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  if (texts.some((text) => text.trim().length === 0)) {
    throw new EmbeddingConfigError("Cannot embed empty text");
  }

  const openai = embedClient();
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBEDDING_BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    vectors.push(...vectorsFromResponse(response.data, batch.length));
  }
  return vectors;
}
