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

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type CitedSource = {
  sourceTitle: string;
  page: number | null;
  snippet: string;
};

function sourceBlock(sources: CitedSource[]) {
  return sources
    .map((source, index) => {
      const page = source.page === null ? "" : ` (page ${source.page})`;
      return `[${index + 1}] ${source.sourceTitle}${page}\n${source.snippet}`;
    })
    .join("\n\n");
}

function chatMessages(input: {
  question: string;
  priorTurns: ChatTurn[];
  sources: CitedSource[];
  summary: string | null;
}) {
  return [
    {
      role: "system" as const,
      content:
        "Answer only from the numbered source excerpts. If they do not contain the answer, say you could not find it in the sources. Do not use outside knowledge.",
    },
    ...(input.summary
      ? [
          {
            role: "system" as const,
            content: `Earlier in this conversation:\n${input.summary}`,
          },
        ]
      : []),
    ...input.priorTurns,
    {
      role: "user" as const,
      content: `Sources:\n${sourceBlock(input.sources)}\n\nQuestion: ${input.question}`,
    },
  ];
}

export async function* streamFromSources(input: {
  model: string;
  question: string;
  priorTurns: ChatTurn[];
  sources: CitedSource[];
  summary: string | null;
}): AsyncGenerator<string> {
  const openai = embedClient();
  const stream = await openai.chat.completions.create({
    model: input.model,
    temperature: 0.2,
    stream: true,
    messages: chatMessages(input),
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      yield text;
    }
  }
}

export async function summarizeConversation(input: {
  model: string;
  previousSummary: string | null;
  turns: ChatTurn[];
}): Promise<string> {
  const transcript = input.turns
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n");
  const previous = input.previousSummary
    ? `Previous summary:\n${input.previousSummary}\n\n`
    : "";
  const openai = embedClient();
  const response = await openai.chat.completions.create({
    model: input.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Compress this study chat into a short memory for the next turn. Keep the user's questions, the conclusions, and which sources were discussed. Do not add facts that are not in the transcript.",
      },
      {
        role: "user",
        content: `${previous}New turns:\n${transcript}`,
      },
    ],
  });
  const summary = response.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Chat model returned an empty summary");
  }
  return summary;
}
