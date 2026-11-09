import { Prisma } from "../../generated/prisma/client.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { findUserById } from "../user/user.repository.js";
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  deleteWorkspace,
  findInviteByToken,
  findPendingInvite,
  getAllWorkspaces,
  getWorkspaceById,
  isWorkspaceMemberEmail,
  isWorkspaceUser,
  updateWorkspace,
} from "./workspace.repository.js";
import {
  CreateWorkspace,
  WorkspaceIdParam,
  UpdateWorkspace,
  publicAcceptedInviteSchema,
  publicInviteSchema,
  publicWorkspacesSchema,
  PublicAcceptedInvite,
  PublicInvite,
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

export async function createWorkspaceInvite(
  ownerId: string,
  workspaceId: string,
  email: string,
): Promise<PublicInvite> {
  if (await isWorkspaceMemberEmail(workspaceId, email)) {
    throw new AppError("This person is already a member", Status.CONFLICT);
  }
  const pending = await findPendingInvite(workspaceId, email);
  if (pending) {
    return publicInviteSchema.parse(pending);
  }
  const invite = await createInvite(workspaceId, email, ownerId);
  return publicInviteSchema.parse(invite);
}

export async function acceptWorkspaceInvite(
  userId: string,
  token: string,
): Promise<PublicAcceptedInvite> {
  const invite = await findInviteByToken(token);
  if (!invite) {
    throw new AppError("Invite not found", Status.NOT_FOUND);
  }
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("Unauthorized", Status.UNAUTHORIZED);
  }
  if (user.email.toLowerCase() !== invite.email) {
    throw new AppError(
      "This invite was sent to a different account",
      Status.FORBIDDEN,
    );
  }
  if (invite.acceptedAt) {
    if (await isWorkspaceUser(invite.workspaceId, userId)) {
      return publicAcceptedInviteSchema.parse({ workspaceId: invite.workspaceId });
    }
    throw new AppError("Invite already used", Status.CONFLICT);
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Invite has expired", Status.BAD_REQUEST);
  }
  await acceptInvite(invite.id, invite.workspaceId, userId);
  return publicAcceptedInviteSchema.parse({ workspaceId: invite.workspaceId });
}

export async function getWorkspace(
  workspaceId: string,
  userId: string,
): Promise<PublicWorkspace> {
  const workspace = await getWorkspaceById(workspaceId, userId);
  if (!workspace) {
    throw new AppError("Workspace not found", Status.NOT_FOUND);
  }
  return publicWorkspaceSchema.parse(workspace);
}
