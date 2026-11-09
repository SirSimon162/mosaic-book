export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type StatusCodeName = keyof typeof StatusCodes;

export const Status = Object.fromEntries(
  (Object.keys(StatusCodes) as StatusCodeName[]).map((name) => [name, name]),
) as { [K in StatusCodeName]: K };
