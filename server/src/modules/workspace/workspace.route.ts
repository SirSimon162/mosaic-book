import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
import { createJsonSourceSchema, createWorkspaceSchema, uploadFileMatchesType, uploadSourceSchema } from "./workspace.types.js";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import {
  createSource,
  createWorkspace,
  deleteSource,
  getSource,
  getWorkspace,
  getWorkspaces,
} from "./workspace.service.js";
import AppError from "../../lib/http-error.js";
import { deleteAsset, saveUpload, upload } from "../../lib/cloudinary-config.js";
import { requireUserId } from "../../types/authed-request.js";

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
  await getWorkspace(workspaceId, requireUserId(req));
  next();
}

workspaceRoutes.post("/create", async (req, res) => {
  const input = createWorkspaceSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid Input");
  }
  const workspace = await createWorkspace(requireUserId(req), input.data);
  return sendSuccess(res, Status.CREATED, workspace);
});

workspaceRoutes.post("/:workspaceId/source", async (req, res) => {
  const input = createJsonSourceSchema.safeParse(req.body);
  if (!input.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid Input")
  }
  const { workspaceId } = req.params;
  if (typeof workspaceId !== "string") {
    throw new AppError("Workspace ID is required", Status.BAD_REQUEST);
  }
  await getWorkspace(workspaceId, requireUserId(req));
  const source = await createSource(workspaceId, input.data);
  return sendSuccess(res, Status.CREATED, source);
});

workspaceRoutes.post(
  "/:workspaceId/source/upload",
  requireWorkspaceAccess,
  upload.single("file"),
  async (req, res) => {
    const input = uploadSourceSchema.safeParse({
      type: req.body.type,
      title: req.body.title,
    });
    if (!input.success) {
      return sendFail(res, Status.BAD_REQUEST, "Invalid Input");
    }

    const file = req.file;
    if (!file) {
      return sendFail(res, Status.BAD_REQUEST, "File is required");
    }
    if (!uploadFileMatchesType(input.data.type, file.originalname)) {
      return sendFail(res, Status.BAD_REQUEST, "Invalid file type");
    }

    const fileUrl = await saveUpload(file);
    const { workspaceId } = req.params as { workspaceId: string };
    try {
      const source = await createSource(workspaceId, {
        ...input.data,
        fileUrl,
      });
      return sendSuccess(res, Status.CREATED, source);
    } catch (error) {
      await deleteAsset(fileUrl).catch(() => undefined);
      throw error;
    }
  },
);

workspaceRoutes.get("/:workspaceId/source/:sourceId", async (req, res) => {
  const { workspaceId, sourceId } = req.params
  if (!workspaceId || !sourceId) {
    throw new AppError("Workspace ID and Source ID are required", Status.BAD_REQUEST);
  }
  await getWorkspace(workspaceId, requireUserId(req))
  const sourceDetails = await getSource(workspaceId, sourceId)
  return sendSuccess(res, Status.OK, sourceDetails)
})

workspaceRoutes.delete("/:workspaceId/source/:sourceId", async (req, res) => {
  const { workspaceId, sourceId } = req.params
  if (!workspaceId || !sourceId) {
    throw new AppError("Workspace ID and Source ID are required", Status.BAD_REQUEST);
  }
  await getWorkspace(workspaceId, requireUserId(req))
  const sourceDetails = await getSource(workspaceId, sourceId)
  if (sourceDetails.fileUrl) {
    await deleteAsset(sourceDetails.fileUrl)
  }
  await deleteSource(workspaceId, sourceId)
  return sendSuccess(res, Status.OK, null)
})

workspaceRoutes.get("/", async (req, res) => {
  const workspaces = await getWorkspaces(requireUserId(req));
  return sendSuccess(res, Status.OK, workspaces);
});

workspaceRoutes.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new AppError("Workspace ID is required", Status.BAD_REQUEST);
  }
  const workspace = await getWorkspace(req.params.id, requireUserId(req));
  return sendSuccess(res, Status.OK, workspace);
});

export default workspaceRoutes;
