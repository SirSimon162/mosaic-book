const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/$/,
  "",
);

type Success<T> = { success: true; result: T };
type Failure = { success: false; error?: string };

type RequestOptions = RequestInit & {
  allowUnauthorized?: boolean;
};

export function isAbort(cause: unknown) {
  return cause instanceof Error && cause.name === "AbortError";
}

export function withQuery(
  path: string,
  query?: Record<string, string | number | undefined>,
) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { allowUnauthorized, headers, body, ...init } = options;
  const nextHeaders = new Headers(headers);
  if (typeof body === "string" && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      body,
      credentials: "include",
      headers: nextHeaders,
    });
  } catch (cause) {
    if (isAbort(cause)) throw cause;
    throw new Error("Could not reach Mosaic. Try again.");
  }

  if (allowUnauthorized && response.status === 401) {
    return null as T;
  }

  let payload: Success<T> | Failure;
  try {
    payload = (await response.json()) as Success<T> | Failure;
  } catch {
    throw new Error("Something went wrong");
  }

  if (!payload.success) {
    throw new Error(payload.error || "Something went wrong");
  }

  return payload.result;
}

export type ServerEvent = {
  event: string;
  data: unknown;
};

function parseEventBlock(block: string): ServerEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  if (data.length === 0) return null;
  const raw = data.join("\n");
  try {
    return { event, data: JSON.parse(raw) as unknown };
  } catch {
    return { event, data: raw };
  }
}

export async function* serverEvents(
  path: string,
  options: { body?: string; signal?: AbortSignal } = {},
): AsyncGenerator<ServerEvent> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      signal: options.signal,
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: options.body,
    });
  } catch (cause) {
    if (isAbort(cause)) throw cause;
    throw new Error("Could not reach Mosaic. Try again.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    let payload: Success<unknown> | Failure;
    try {
      payload = (await response.json()) as Success<unknown> | Failure;
    } catch {
      throw new Error("Something went wrong");
    }
    if (!payload.success) throw new Error(payload.error || "Something went wrong");
    return;
  }

  if (!response.body) throw new Error("Something went wrong");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let splitAt = buffer.indexOf("\n\n");
      while (splitAt !== -1) {
        const parsed = parseEventBlock(buffer.slice(0, splitAt));
        buffer = buffer.slice(splitAt + 2);
        if (parsed) yield parsed;
        splitAt = buffer.indexOf("\n\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const parsed = parseEventBlock(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}
