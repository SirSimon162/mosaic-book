import { Prisma } from "../../generated/prisma/client.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import {
  createWorkspace,
  deleteWorkspace,
  getAllWorkspaces,
  getWorkspaceById,
  updateWorkspace,
} from "./workspace.repository.js";
import {
  CreateWorkspace,
  WorkspaceIdParam,
  UpdateWorkspace,
  publicWorkspacesSchema,
  PublicWorkspaces,
  PublicWorkspace,
  publicWorkspaceSchema,
} from "./workspace.types.js";

function assertWorkspaceFound(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    throw new AppError("Workspace not found", Status.NOT_FOUND);
  }
  throw e;
}

export async function createNewWorkspace(
  userId: string,
  input: CreateWorkspace,
) {
  return createWorkspace(userId, input);
}

export async function updateWorkspaceById(
  ownerId: string,
  workspaceId: string,
  input: UpdateWorkspace,
) {
  try {
    return await updateWorkspace(ownerId, workspaceId, input);
  } catch (e) {
    assertWorkspaceFound(e);
  }
}

export async function deleteWorkspaceById(
  ownerId: string,
  input: WorkspaceIdParam,
) {
  try {
    await deleteWorkspace(ownerId, input);
  } catch (e) {
    assertWorkspaceFound(e);
  }
}

export async function getAllUserWorkspaces(
  userId: string,
  limit: number,
  offset: number,
): Promise<PublicWorkspaces> {
  const rows = await getAllWorkspaces(userId, limit + 1, offset);
  const hasMore = rows.length > limit;
  const workspaces = hasMore ? rows.slice(0, limit) : rows;
  return publicWorkspacesSchema.parse({ workspaces, limit, offset, hasMore });
}

export async function getWorkspace(workspaceId: string, userId: string): Promise<PublicWorkspace> {
  const workspace = await getWorkspaceById(workspaceId, userId)
  if (!workspace) {
    throw new AppError("Workspace not found", Status.NOT_FOUND);
  }
  return publicWorkspaceSchema.parse(workspace)
}
