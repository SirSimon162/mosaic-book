import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { UserRole } from "../auth/auth.types.js";
import {
  createNewWorkspace,
  getWorkspacesByUserId,
  getWorkspaceById,
  createNewSource,
} from "./workspace.repository.js";
import {
  CreateWorkspaceInput,
  PublicWorkspace,
  PublicWorkspacesList,
  PublicWorkspaceDetails,
  SourceStatus,
  SourceType,
  CreateSourceInput,
  PublicSource,
} from "./workspace.types.js";

export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceInput,
): Promise<PublicWorkspace> {
  const workspace = await createNewWorkspace(userId, input);
  return {
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    users: workspace.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName,
      lastName: user.lastName,
    })),
  };
}

export async function getWorkspaces(
  userId: string,
): Promise<PublicWorkspacesList[]> {
  const workspaces = await getWorkspacesByUserId(userId);
  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
  }));
}

export async function getWorkspace(
  workspaceId: string,
  userId: string,
): Promise<PublicWorkspaceDetails> {
  const workspace = await getWorkspaceById(workspaceId, userId);
  if (!workspace) {
    throw new AppError("Workspace not found", Status.NOT_FOUND);
  }
  return {
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    users: workspace.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName,
      lastName: user.lastName,
    })),
    chats: workspace.chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
    })),
    sources: workspace.sources.map((source) => ({
      id: source.id,
      title: source.title,
      type: source.type as SourceType,
      status: source.status as SourceStatus,
    })),
  };
}

export async function createSource( workspaceId: string, input: CreateSourceInput): Promise<PublicSource> {
  const source = await createNewSource(workspaceId, input.type, input.title, input.content)
  return {
    id: source.id,
    title: source.title,
    workspaceId: source.workspaceId,
    type: source.type as SourceType,
    status: source.status as SourceStatus
  }
}