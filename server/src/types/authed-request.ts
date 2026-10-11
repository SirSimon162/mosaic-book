import type { Request } from "express";
import AppError from "../lib/http-error.js";
import { Status } from "../lib/http-code.js";

export type AuthedRequest = Request & { userId: string };

export function requireUserId(req: Request): string {
  if (typeof req.userId !== "string") {
    throw new AppError("Unauthorized", Status.UNAUTHORIZED);
  }
  return req.userId;
}
