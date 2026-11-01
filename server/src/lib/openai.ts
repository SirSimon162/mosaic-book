import OpenAI from "openai";
import { CHAT_MODELS, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./ai-config.js";
import environment from "../config/env.js";

let client: OpenAI | null = null;

export async function embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!environment.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    if (!client) client = new OpenAI({ apiKey: environment.OPENAI_API_KEY });
    const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS
    })
    return response.data.sort((a, b) => a.index - b.index).map((embedding) => embedding.embedding);
}