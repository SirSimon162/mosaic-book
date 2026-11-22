import {
  QUERY_FUZZY_MAX_DISTANCE,
  QUERY_FUZZY_MIN_TOKEN,
  QUERY_FUZZY_MAX_CORRECTIONS,
} from "./ai-config.js";

const TOKEN_RE = /[A-Za-z][A-Za-z0-9_-]{2,}/g;

export type QueryCorrection = {
  query: string;
  corrections: { from: string; to: string }[];
};

type VocabIndex = {
  vocab: Map<string, string>;
  /** Adjacent token pairs from workspace text (lowercase keys). */
  neighbors: Map<string, Set<string>>;
};

type Candidate = { key: string; word: string; distance: number };

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const next = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) prev[j] = j;
  for (let i = 1; i < rows; i += 1) {
    next[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j += 1) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      next[j] = Math.min(next[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j < cols; j += 1) prev[j] = next[j]!;
  }
  return prev[b.length]!;
}

function maxDistanceFor(token: string) {
  if (token.length <= 4) return 1;
  if (token.length <= 7) return Math.min(2, QUERY_FUZZY_MAX_DISTANCE);
  return QUERY_FUZZY_MAX_DISTANCE;
}

function needsNeighborSupport(token: string) {
  // Short tokens are too ambiguous for distance-only rewrites.
  return token.length <= 3;
}

function linkNeighbors(neighbors: Map<string, Set<string>>, a: string, b: string) {
  if (a === b) return;
  let left = neighbors.get(a);
  if (!left) {
    left = new Set();
    neighbors.set(a, left);
  }
  left.add(b);
  let right = neighbors.get(b);
  if (!right) {
    right = new Set();
    neighbors.set(b, right);
  }
  right.add(a);
}

function collectVocab(documents: string[]): VocabIndex {
  const vocab = new Map<string, string>();
  const neighbors = new Map<string, Set<string>>();

  for (const document of documents) {
    const matches = document.match(TOKEN_RE) ?? [];
    const keys: string[] = [];
    for (const raw of matches) {
      if (raw.length < QUERY_FUZZY_MIN_TOKEN) continue;
      const key = raw.toLowerCase();
      if (!vocab.has(key)) vocab.set(key, raw);
      keys.push(key);
    }
    for (let i = 0; i < keys.length - 1; i += 1) {
      linkNeighbors(neighbors, keys[i]!, keys[i + 1]!);
    }
  }

  return { vocab, neighbors };
}

function coOccursWithAnchor(
  candidateKey: string,
  anchors: Set<string>,
  neighbors: Map<string, Set<string>>,
) {
  if (anchors.size === 0) return false;
  const nearby = neighbors.get(candidateKey);
  if (!nearby) return false;
  for (const anchor of anchors) {
    if (nearby.has(anchor)) return true;
  }
  return false;
}

function sharedPrefixLength(a: string, b: string) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1;
  return i;
}

function pickUniqueWinner(tokenKey: string, candidates: Candidate[]): string | null {
  if (candidates.length === 0) return null;
  let best: Candidate | null = null;
  let tied = false;
  for (const candidate of candidates) {
    if (!best) {
      best = candidate;
      tied = false;
      continue;
    }
    if (candidate.distance < best.distance) {
      best = candidate;
      tied = false;
      continue;
    }
    if (candidate.distance > best.distance) continue;
    // Same edit distance: prefer longer shared prefix (sheh → shah over sehh).
    const bestPrefix = sharedPrefixLength(tokenKey, best.key);
    const nextPrefix = sharedPrefixLength(tokenKey, candidate.key);
    if (nextPrefix > bestPrefix) {
      best = candidate;
      tied = false;
      continue;
    }
    if (nextPrefix < bestPrefix) continue;
    const bestLenGap = Math.abs(best.key.length - tokenKey.length);
    const nextLenGap = Math.abs(candidate.key.length - tokenKey.length);
    if (nextLenGap < bestLenGap) {
      best = candidate;
      tied = false;
      continue;
    }
    if (nextLenGap > bestLenGap) continue;
    tied = true;
  }
  if (!best || tied) return null;
  return best.word;
}

function bestCorrection(
  token: string,
  vocab: Map<string, string>,
  neighbors: Map<string, Set<string>>,
  anchors: Set<string>,
): string | null {
  const key = token.toLowerCase();
  if (vocab.has(key)) return null;

  const maxDistance = maxDistanceFor(token);
  const candidates: Candidate[] = [];
  for (const [candidateKey, surface] of vocab) {
    if (Math.abs(candidateKey.length - key.length) > maxDistance) continue;
    const distance = levenshtein(key, candidateKey);
    if (distance === 0 || distance > maxDistance) continue;
    candidates.push({ key: candidateKey, word: surface, distance });
  }
  if (candidates.length === 0) return null;

  const anchored = candidates.filter((candidate) =>
    coOccursWithAnchor(candidate.key, anchors, neighbors),
  );
  if (anchored.length > 0) {
    return pickUniqueWinner(key, anchored);
  }

  if (needsNeighborSupport(token)) return null;
  return pickUniqueWinner(key, candidates);
}

export function correctQueryAgainstVocab(
  query: string,
  documents: string[],
): QueryCorrection {
  const trimmed = query.trim();
  if (!trimmed || documents.length === 0) {
    return { query: trimmed, corrections: [] };
  }

  const { vocab, neighbors } = collectVocab(documents);
  if (vocab.size === 0) return { query: trimmed, corrections: [] };

  const tokens = trimmed.match(TOKEN_RE) ?? [];
  const anchors = new Set(
    tokens
      .map((token) => token.toLowerCase())
      .filter((token) => token.length >= QUERY_FUZZY_MIN_TOKEN && vocab.has(token)),
  );

  const corrections: { from: string; to: string }[] = [];
  const rewritten = trimmed.replace(TOKEN_RE, (token) => {
    if (corrections.length >= QUERY_FUZZY_MAX_CORRECTIONS) return token;
    if (token.length < QUERY_FUZZY_MIN_TOKEN) return token;
    const next = bestCorrection(token, vocab, neighbors, anchors);
    if (!next || next.toLowerCase() === token.toLowerCase()) return token;
    corrections.push({ from: token, to: next });
    return next;
  });

  return { query: rewritten, corrections };
}
