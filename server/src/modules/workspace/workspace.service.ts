import { Prisma } from "../../generated/prisma/client.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { createWorkspace, deleteWorkspace, updateWorkspace } from "./workspace.repository.js";
import { CreateWorkspace, WorkspaceIdParam, UpdateWorkspace } from "./workspace.types.js";

function assertWorkspaceFound(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    throw new AppError("Workspace not found", Status.NOT_FOUND);
  }
  throw e;
}

export async function createNewWorkspace(userId: string, input: CreateWorkspace) {
  return createWorkspace(userId, input);
}

export async function updateWorkspaceById(ownerId: string, workspaceId: string, input: UpdateWorkspace) {
  try { return await updateWorkspace(ownerId, workspaceId, input); } catch (e) { assertWorkspaceFound(e) }
}

export async function deleteWorkspaceById(ownerId: string, input: WorkspaceIdParam) {
  try { await deleteWorkspace(ownerId, input); } catch (e) { assertWorkspaceFound(e) }
}