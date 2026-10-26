import {
  YoutubeTranscript,
  YoutubeTranscriptError,
  YoutubeTranscriptTooManyRequestError,
} from "youtube-transcript";

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i;

export class EmptyYoutubeError extends Error {
  constructor(message = "No transcript could be extracted from the video") {
    super(message);
    this.name = "EmptyYoutubeError";
  }
}

export function parseYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.match(YOUTUBE_ID_RE)?.[1] ?? null;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export async function fetchYoutubeTranscript(url: string) {
  const videoId = parseYoutubeVideoId(url);
  if (!videoId) {
    throw new EmptyYoutubeError("Impossible to retrieve Youtube video ID.");
  }

  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (error) {
    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      throw error;
    }
    if (error instanceof YoutubeTranscriptError) {
      throw new EmptyYoutubeError(error.message);
    }
    throw error;
  }

  const text = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ");

  if (!text) {
    throw new EmptyYoutubeError();
  }

  return {
    text,
    videoId,
    sourceUrl: youtubeWatchUrl(videoId),
  };
}
