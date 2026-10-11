import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { UserRole } from "../auth/auth.types.js";
import {
  createNewWorkspace,
  getWorkspacesByUserId,
  getWorkspaceById,
  createNewSource,
  deleteSourceById,
  getSourceById,
} from "./workspace.repository.js";
import {
  CreateWorkspaceInput,
  PublicWorkspace,
  PublicWorkspacesList,
  PublicWorkspaceDetails,
  SourceStatus,
  SourceType,
  CreateSourcePayload,
  PublicSource,
  PublicSourceDetails,
  CreateSourceRow
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
      role: user.role,
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
      role: user.role,
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
      type: source.type,
      status: source.status,
    })),
  };
}

function toSourceRow(input: CreateSourcePayload): CreateSourceRow {
  switch (input.type) {
    case SourceType.TEXT:
    case SourceType.MARKDOWN:
      return {
        type: input.type,
        title: input.title,
        source: input.content,
        fileUrl: null,
      };
    case SourceType.PDF:
    case SourceType.DOC:
    case SourceType.CSV:
      return {
        type: input.type,
        title: input.title,
        source: null,
        fileUrl: input.fileUrl,
      };
    case SourceType.WEBSITE:
      return {
        type: input.type,
        title: input.title,
        source: input.url,
        fileUrl: null,
      };
  }
}

export async function createSource(
  workspaceId: string,
  input: CreateSourcePayload,
): Promise<PublicSource> {
  const source = await createNewSource(workspaceId, toSourceRow(input));
  return {
    id: source.id,
    title: source.title,
    workspaceId: source.workspaceId,
    type: source.type,
    status: source.status,
  };
}

export async function getSource(
  workspaceId: string,
  sourceId: string,
): Promise<PublicSourceDetails> {
  const source = await getSourceById(workspaceId, sourceId);
  if (!source) {
    throw new AppError("Source not found", Status.NOT_FOUND);
  }
  return {
    id: source.id,
    title: source.title,
    type: source.type,
    source: source.source,
    fileUrl: source.fileUrl,
  };
}

export async function deleteSource(workspaceId: string, sourceId: string) {
  await deleteSourceById(workspaceId, sourceId)
}