import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { enqueueArtifactGeneration } from "../../lib/artifact-events.js";
import { listCompletedSourceIds } from "../source/source.repository.js";
import {
  createArtifact,
  getArtifact,
} from "./artifact.repository.js";
import {
  CreateArtifact,
  DEFAULT_ARTIFACT_TITLE,
  publicArtifactSchema,
  PublicArtifact,
} from "./artifact.types.js";

async function resolveSourceIds(workspaceId: string, sourceIds: string[] | undefined) {
  if (sourceIds) {
    const unique = [...new Set(sourceIds)];
    const found = await listCompletedSourceIds(workspaceId, unique);
    if (found.length !== unique.length) {
      throw new AppError(
        "One or more sources are not completed in this workspace",
        Status.BAD_REQUEST,
      );
    }
    return unique;
  }

  const completed = await listCompletedSourceIds(workspaceId);
  if (completed.length === 0) {
    throw new AppError(
      "No completed sources in this workspace",
      Status.BAD_REQUEST,
    );
  }
  return completed;
}

export async function createWorkspaceArtifact(
  workspaceId: string,
  input: CreateArtifact,
): Promise<PublicArtifact> {
  const sourceIds = await resolveSourceIds(workspaceId, input.sourceIds);
  const artifact = await createArtifact(workspaceId, {
    type: input.type,
    title: input.title ?? DEFAULT_ARTIFACT_TITLE[input.type],
    sourceIds,
  });
  await enqueueArtifactGeneration({
    artifactId: artifact.id,
    workspaceId,
  });
  return publicArtifactSchema.parse(artifact);
}

export async function getWorkspaceArtifact(
  workspaceId: string,
  artifactId: string,
): Promise<PublicArtifact> {
  const artifact = await getArtifact(workspaceId, artifactId);
  if (!artifact) {
    throw new AppError("Artifact not found", Status.NOT_FOUND);
  }
  return publicArtifactSchema.parse(artifact);
}
