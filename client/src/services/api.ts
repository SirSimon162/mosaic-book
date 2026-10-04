const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/$/,
  "",
);

type Success<T> = { success: true; result: T };
type Failure = { success: false; error?: string };

type RequestOptions = RequestInit & {
  allowUnauthorized?: boolean;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { allowUnauthorized, headers, ...init } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  } catch {
    throw new Error("Could not reach Mosaic. Try again.");
  }

  if (allowUnauthorized && response.status === 401) {
    return null as T;
  }

  let body: Success<T> | Failure;
  try {
    body = (await response.json()) as Success<T> | Failure;
  } catch {
    throw new Error("Something went wrong");
  }

  if (!body.success) {
    throw new Error(body.error || "Something went wrong");
  }

  return body.result;
}
