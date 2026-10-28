import { CHUNK_SIZE, CHUNK_OVERLAP } from "./ai-config.js";

export type TextChunk = {
    index: number;
    content: string;
    metadata?: Record<string, unknown>;
};

const SEPARATORS = ["\n\n", "\n", " ", ""];

function clampOverlap(chunkSize: number, chunkOverlap: number) {
    return Math.min(Math.max(chunkOverlap, 0), Math.max(chunkSize - 1, 0));
}

function joinParts(parts: string[], separator: string) {
    const text = parts.join(separator).trim();
    return text.length > 0 ? text : null;
}

function splitByLength(text: string, chunkSize: number, chunkOverlap: number) {
    if (text.length <= chunkSize) {
        return text.trim() ? [text] : [];
    }

    const step = Math.max(1, chunkSize - chunkOverlap);
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += step) {
        chunks.push(text.slice(i, i + chunkSize));
        if (i + chunkSize >= text.length) {
            break;
        }
    }
    return chunks.filter((chunk) => chunk.trim().length > 0);
}

function mergeSplits(
    splits: string[],
    separator: string,
    chunkSize: number,
    chunkOverlap: number,
) {
    const docs: string[] = [];
    let current: string[] = [];
    let total = 0;
    const sepLen = separator.length;

    for (const split of splits) {
        const len = split.length;
        const extra = current.length > 0 ? sepLen : 0;

        if (total + len + extra > chunkSize && current.length > 0) {
            const doc = joinParts(current, separator);
            if (doc) {
                docs.push(doc);
            }

            while (current.length > 0) {
                const first = current[0];
                if (first === undefined) {
                    break;
                }
                const stillOverflows =
                    total + len + (current.length > 0 ? sepLen : 0) > chunkSize;
                if (total <= chunkOverlap && !stillOverflows) {
                    break;
                }
                total -= first.length + (current.length > 1 ? sepLen : 0);
                current = current.slice(1);
            }
        }

        current.push(split);
        total += len + (current.length > 1 ? sepLen : 0);
    }

    const last = joinParts(current, separator);
    if (last) {
        docs.push(last);
    }
    return docs;
}

function splitText(
    text: string,
    separators: string[],
    chunkSize: number,
    chunkOverlap: number,
): string[] {
    const separator = separators[0] ?? "";
    const nextSeparators = separators.slice(1);

    if (!separator) {
        return splitByLength(text, chunkSize, chunkOverlap);
    }

    const rawSplits = text.split(separator).filter((part) => part.length > 0);
    const chunks: string[] = [];
    let goodSplits: string[] = [];

    for (const split of rawSplits) {
        if (split.length <= chunkSize) {
            goodSplits.push(split);
            continue;
        }

        if (goodSplits.length > 0) {
            chunks.push(
                ...mergeSplits(goodSplits, separator, chunkSize, chunkOverlap),
            );
            goodSplits = [];
        }

        chunks.push(
            ...splitText(split, nextSeparators, chunkSize, chunkOverlap),
        );
    }

    if (goodSplits.length > 0) {
        chunks.push(
            ...mergeSplits(goodSplits, separator, chunkSize, chunkOverlap),
        );
    }

    return chunks;
}

export function chunkText(
    text: string,
    options: {
        chunkSize?: number;
        chunkOverlap?: number;
        metadata?: Record<string, unknown>;
    } = {},
): TextChunk[] {
    const chunkSize = Math.max(1, options.chunkSize ?? CHUNK_SIZE);
    const chunkOverlap = clampOverlap(
        chunkSize,
        options.chunkOverlap ?? CHUNK_OVERLAP,
    );
    const parts = splitText(text, SEPARATORS, chunkSize, chunkOverlap);
    return parts.map((content, index) => ({
        index,
        content,
        ...(options.metadata ? { metadata: options.metadata } : {}),
    }));
}

export function chunkPages(
    pages: string[],
    options: {
        chunkSize?: number;
        chunkOverlap?: number;
    } = {},
): TextChunk[] {
    const chunks: TextChunk[] = [];
    let index = 0;

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const pageText = pages[pageIndex]?.trim();
        if (!pageText) {
            continue;
        }
        const pageChunks = chunkText(pageText, {
            ...options,
            metadata: { page: pageIndex + 1 },
        });
        for (const chunk of pageChunks) {
            chunks.push({
                index,
                content: chunk.content,
                ...(chunk.metadata ? { metadata: chunk.metadata } : {}),
            });
            index += 1;
        }
    }
    return chunks;
}
