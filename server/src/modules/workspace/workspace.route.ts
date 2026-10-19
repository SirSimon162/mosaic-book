import express, {
  type Router,
} from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import { requireUserId } from "../../types/authed-request.js";
import {
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
} from "./workspace.types.js";
import {
  createNewWorkspace,
  deleteWorkspaceById,
  getAllUserWorkspaces,
  getWorkspace,
  updateWorkspaceById,
} from "./workspace.service.js";
import sourceRoutes from "../source/source.route.js";
import { requireWorkspaceUserAccess } from "../../middleware/index.js";

const workspaceRoutes: Router = express.Router();

workspaceRoutes.post("/create", async (req, res) => {
  const input = createWorkspaceSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspace = await createNewWorkspace(requireUserId(req), input.data);
  return sendSuccess(res, Status.CREATED, workspace);
});

workspaceRoutes.put("/:workspaceId", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const input = updateWorkspaceSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspace = await updateWorkspaceById(
    requireUserId(req),
    params.data.workspaceId,
    input.data,
  );
  return sendSuccess(res, Status.OK, workspace);
});

workspaceRoutes.delete("/:workspaceId", async (req, res) => {
  const input = workspaceIdParamSchema.safeParse(req.params);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  await deleteWorkspaceById(requireUserId(req), input.data);
  return sendSuccess(res, Status.OK, null);
});

workspaceRoutes.get("/", async (req, res) => {
  const query = listWorkspacesQuerySchema.safeParse(req.query);
  if (!query.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspaces = await getAllUserWorkspaces(
    requireUserId(req),
    query.data.limit,
    query.data.offset,
  );
  return sendSuccess(res, Status.OK, workspaces);
});

workspaceRoutes.use("/:workspaceId/source", requireWorkspaceUserAccess, sourceRoutes);

workspaceRoutes.get("/:workspaceId", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspace = await getWorkspace(params.data.workspaceId, requireUserId(req))
  return sendSuccess(res, Status.OK, workspace);
});


export default workspaceRoutes;
