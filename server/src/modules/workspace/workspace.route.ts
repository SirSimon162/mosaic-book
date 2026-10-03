import express, { type Router } from "express";
import { createWorkspaceSchema } from "./workspace.types.js";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import {
  createWorkspace,
  getWorkspace,
  getWorkspaces,
} from "./workspace.service.js";
import AppError from "../../lib/http-error.js";

const workspaceRoutes: Router = express.Router();

workspaceRoutes.post("/create", async (req, res) => {
  const input = createWorkspaceSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid Input");
  }
  const workspace = await createWorkspace(req.userId!, input.data);
  return sendSuccess(res, Status.CREATED, workspace);
});

workspaceRoutes.get("/", async (req, res) => {
  const workspaces = await getWorkspaces(req.userId!);
  return sendSuccess(res, Status.OK, workspaces);
});

workspaceRoutes.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new AppError("Workspace ID is required", Status.BAD_REQUEST);
  }
  const workspace = await getWorkspace(req.params.id, req.userId!);
  return sendSuccess(res, Status.OK, workspace);
});

export default workspaceRoutes;
