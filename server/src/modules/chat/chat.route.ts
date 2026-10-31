import express, { type Router } from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import { workspaceIdParamSchema } from "../workspace/workspace.types.js";
import {
  createChat,
  deleteChat,
  getChatById,
  listChats,
  sendMessage,
} from "./chat.service.js";
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

chatRoutes.post("/:chatId/messages", async (req, res) => {
  const params = chatIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const body = createMessageSchema.safeParse(req.body);
  if (!body.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const messages = await sendMessage(
    params.data.workspaceId,
    params.data.chatId,
    body.data,
  );
  return sendSuccess(res, Status.CREATED, messages);
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
