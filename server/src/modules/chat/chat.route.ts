import express, { type Router } from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import { workspaceIdParamSchema } from "../workspace/workspace.types.js";
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
  return sendSuccess(res, Status.OK, null);
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
  return sendSuccess(res, Status.CREATED, null);
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
  return sendSuccess(res, Status.CREATED, null);
});

chatRoutes.get("/:chatId", async (req, res) => {
  const params = chatIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  return sendSuccess(res, Status.OK, null);
});

chatRoutes.delete("/:chatId", async (req, res) => {
  const params = chatIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  return sendSuccess(res, Status.OK, null);
});

export default chatRoutes;
