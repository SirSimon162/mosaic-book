import { RRF_K, RAG_TOP_K } from "./ai-config.js";
import type { ChunkSearchHit } from "../modules/source/source.types.js";

export function reciprocalRankFusion(
  groups: ChunkSearchHit[][],
  options?: { k?: number; limit?: number },
): ChunkSearchHit[] {
  const k = options?.k ?? RRF_K;
  const limit = options?.limit ?? RAG_TOP_K;
  const fused = new Map<string, { hit: ChunkSearchHit; score: number }>();

  for (const group of groups) {
    group.forEach((hit, index) => {
      const rank = index + 1;
      const contribution = 1 / (k + rank);
      const current = fused.get(hit.chunkId);
      if (!current) {
        fused.set(hit.chunkId, { hit, score: contribution });
        return;
      }
      current.score += contribution;
      if (hit.score > current.hit.score) {
        current.hit = hit;
      }
    });
  }

  return [...fused.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.hit.score - left.hit.score ||
        left.hit.index - right.hit.index,
    )
    .slice(0, limit)
    .map((entry) => entry.hit);
}
