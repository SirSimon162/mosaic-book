import express, { type Response, type Router } from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status, StatusCodes } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { workspaceIdParamSchema } from "../workspace/workspace.types.js";
import {
  createChat,
  deleteChat,
  getChatById,
  listChats,
  streamChatReply,
  type ChatStreamEvent,
} from "./chat.service.js";
import { limitChatMessages } from "../../middleware/index.js";
import {
  chatIdParamSchema,
  createChatSchema,
  createMessageSchema,
} from "./chat.types.js";

const chatRoutes: Router = express.Router({ mergeParams: true });

chatRoutes.get("/", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const chats = await listChats(params.data.workspaceId);
  return sendSuccess(res, Status.OK, chats);
});

chatRoutes.post("/", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const body = createChatSchema.safeParse(req.body);
  if (!body.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const chat = await createChat(params.data.workspaceId, body.data);
  return sendSuccess(res, Status.CREATED, chat);
});

function writeSse(res: Response, event: ChatStreamEvent | { type: "error"; message: string }) {
  const { type, ...data } = event;
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

chatRoutes.post("/:chatId/messages", limitChatMessages, async (req, res) => {
  const params = chatIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const body = createMessageSchema.safeParse(req.body);
  if (!body.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }

  let finished = false;
  let aborted = false;
  res.on("close", () => {
    if (!finished) {
      aborted = true;
    }
  });

  let started = false;
  const start = () => {
    if (started) {
      return;
    }
    res.status(StatusCodes.OK);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    started = true;
  };

  try {
    for await (const event of streamChatReply(
      params.data.workspaceId,
      params.data.chatId,
      body.data,
      () => aborted,
    )) {
      start();
      if (!aborted) {
        writeSse(res, event);
      }
    }
    finished = true;
    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    if (!started) {
      if (error instanceof AppError) {
        return sendFail(res, error.statusName, error.message);
      }
      console.error(error);
      return sendFail(res, Status.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }
    console.error(error);
    if (!aborted) {
      writeSse(res, { type: "error", message: "The reply failed." });
    }
    finished = true;
    if (!res.writableEnded) {
      res.end();
    }
  }
});

chatRoutes.get("/:chatId", async (req, res) => {
  const params = chatIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const chat = await getChatById(
    params.data.workspaceId,
    params.data.chatId,
  );
  return sendSuccess(res, Status.OK, chat);
});

chatRoutes.delete("/:chatId", async (req, res) => {
  const params = chatIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  await deleteChat(params.data.workspaceId, params.data.chatId);
  return sendSuccess(res, Status.OK, null);
});

export default chatRoutes;
