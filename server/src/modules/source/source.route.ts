import express, { type Router } from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import { workspaceIdParamSchema } from "../workspace/workspace.types.js";
import {
  createSource,
  listSourcesByWorkspaceId,
  parseListQuery,
} from "./source.service.js";
import { createSourceSchema } from "./source.types.js";

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

// sourceRoutes.post("/bulk-delete", async (req, res) => { })

// sourceRoutes.get("/:sourceId", async (req, res) => { })

// sourceRoutes.delete("/:sourceId", async (req, res) => { })

export default sourceRoutes;
