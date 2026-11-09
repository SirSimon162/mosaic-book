import { type Request, type RequestHandler } from "express";
import AppError from "../lib/http-error.js";
import { Status } from "../lib/http-code.js";
import { requireUserId } from "../types/authed-request.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function clientAddress(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function rateLimit(options: {
  name: string;
  limit: number;
  windowMs: number;
  key: (req: Request) => string;
}): RequestHandler {
  return (req, _res, next) => {
    const now = Date.now();
    const key = `${options.name}:${options.key(req)}`;
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }
    if (current.count >= options.limit) {
      next(new AppError("Too many requests", Status.TOO_MANY_REQUESTS));
      return;
    }
    current.count += 1;
    next();
  };
}

const MINUTE = 60_000;
const FIFTEEN_MINUTES = 15 * MINUTE;
const HOUR = 60 * MINUTE;

export const limitRegister = rateLimit({
  name: "register",
  limit: 5,
  windowMs: FIFTEEN_MINUTES,
  key: clientAddress,
});

export const limitLogin = rateLimit({
  name: "login",
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
  key: clientAddress,
});

export const limitChatMessages = rateLimit({
  name: "chat-message",
  limit: 20,
  windowMs: MINUTE,
  key: requireUserId,
});

export const limitSourceSearch = rateLimit({
  name: "source-search",
  limit: 30,
  windowMs: MINUTE,
  key: requireUserId,
});

export const limitArtifactGeneration = rateLimit({
  name: "artifact-generate",
  limit: 10,
  windowMs: HOUR,
  key: requireUserId,
});
