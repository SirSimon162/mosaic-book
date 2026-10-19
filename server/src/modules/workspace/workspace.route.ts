import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import {
  deleteAsset,
  saveUpload,
  upload,
} from "../../lib/cloudinary-config.js";
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

const workspaceRoutes: Router = express.Router();

async function requireWorkspaceAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { workspaceId } = req.params;
  if (typeof workspaceId !== "string") {
    throw new AppError("Workspace ID is required", Status.BAD_REQUEST);
  }
  next();
}

workspaceRoutes.post("/create", async (req, res) => {
  const input = createWorkspaceSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspace = await createNewWorkspace(requireUserId(req), input.data);
  return sendSuccess(res, Status.CREATED, workspace);
});

workspaceRoutes.put("/:id", async (req, res) => {
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
    params.data.id,
    input.data,
  );
  return sendSuccess(res, Status.OK, workspace);
});

workspaceRoutes.delete("/:id", async (req, res) => {
  const input = workspaceIdParamSchema.safeParse(req.params);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  await deleteWorkspaceById(requireUserId(req), input.data);
  return sendSuccess(res, Status.OK, null);
});

workspaceRoutes.post("/:workspaceId/source", async (req, res) => { });

workspaceRoutes.post(
  "/:workspaceId/source/upload",
  requireWorkspaceAccess,
  upload.single("file"),
  async (req, res) => { },
);

workspaceRoutes.get("/:workspaceId/source/:sourceId", async (req, res) => {
  const { workspaceId, sourceId } = req.params;
  if (!workspaceId || !sourceId) {
    throw new AppError(
      "Workspace ID and Source ID are required",
      Status.BAD_REQUEST,
    );
  }
});

workspaceRoutes.delete("/:workspaceId/source/:sourceId", async (req, res) => {
  const { workspaceId, sourceId } = req.params;
  if (!workspaceId || !sourceId) {
    throw new AppError(
      "Workspace ID and Source ID are required",
      Status.BAD_REQUEST,
    );
  }
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

workspaceRoutes.get("/:id", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspace = await getWorkspace(params.data.id, requireUserId(req))
  return sendSuccess(res, Status.OK, workspace);
});

export default workspaceRoutes;
