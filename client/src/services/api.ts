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
