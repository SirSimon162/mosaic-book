import express, { type Router } from "express";
import { sendFail, sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";
import { limitArtifactGeneration } from "../../middleware/index.js";
import { workspaceIdParamSchema } from "../workspace/workspace.types.js";
import {
  createWorkspaceArtifact,
  getWorkspaceArtifact,
} from "./artifact.service.js";
import {
  artifactIdParamSchema,
  createArtifactSchema,
} from "./artifact.types.js";

const artifactRoutes: Router = express.Router({ mergeParams: true });

artifactRoutes.post("/", limitArtifactGeneration, async (req, res) => {
  const params = workspaceIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const body = createArtifactSchema.safeParse(req.body);
  if (!body.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const artifact = await createWorkspaceArtifact(
    params.data.workspaceId,
    body.data,
  );
  return sendSuccess(res, Status.CREATED, artifact);
});

artifactRoutes.get("/:artifactId", async (req, res) => {
  const params = artifactIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendFail(res, Status.BAD_REQUEST, "Invalid input");
  }
  const artifact = await getWorkspaceArtifact(
    params.data.workspaceId,
    params.data.artifactId,
  );
  return sendSuccess(res, Status.OK, artifact);
});

export default artifactRoutes;
