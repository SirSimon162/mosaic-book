import express, { type Router } from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import { workspaceIdParamSchema } from "../workspace/workspace.types.js";
import {
  createSource,
  getSourceById,
  importPdfSource,
  importWebsiteSource,
  listSourcesByWorkspaceId,
  parseListQuery,
} from "./source.service.js";
import {
  createSourceSchema,
  importPdfSchema,
  importWebsiteSchema,
  sourceIdParamSchema,
} from "./source.types.js";
import { upload } from "../../lib/cloudinary-config.js";

const sourceRoutes: Router = express.Router({ mergeParams: true });

sourceRoutes.get("/", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspaceId = params.data.workspaceId;
  const filters = parseListQuery(req.query);
  const sources = await listSourcesByWorkspaceId(workspaceId, filters);
  return sendSuccess(res, Status.OK, sources);
});

sourceRoutes.post("/", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspaceId = params.data.workspaceId;
  const body = createSourceSchema.safeParse(req.body);
  if (!body.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const source = await createSource(workspaceId, body.data);
  return sendSuccess(res, Status.CREATED, source);
});

sourceRoutes.post("/import/website", async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspaceId = params.data.workspaceId;
  const body = importWebsiteSchema.safeParse(req.body);
  if (!body.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const source = await importWebsiteSource(workspaceId, body.data);
  return sendSuccess(res, Status.CREATED, source);
});

sourceRoutes.post("/import/pdf", upload.single("file"), async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const workspaceId = params.data.workspaceId;
  const body = importPdfSchema.safeParse(req.body);
  if (
    !body.success ||
    !req.file ||
    !(req.file.mimetype === "application/pdf")
  ) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const source = await importPdfSource(
    workspaceId,
    body.data,
    req.file as Express.Multer.File,
  );
  return sendSuccess(res, Status.CREATED, source);
});

// sourceRoutes.post("/bulk-delete", async (req, res) => { })

sourceRoutes.get("/:sourceId", async (req, res) => {
  const params = sourceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const sourceId = params.data.sourceId;
  const workspaceId = params.data.workspaceId;
  const source = await getSourceById(workspaceId, sourceId);
  return sendSuccess(res, Status.OK, source);
});

// sourceRoutes.delete("/:sourceId", async (req, res) => { })

export default sourceRoutes;
