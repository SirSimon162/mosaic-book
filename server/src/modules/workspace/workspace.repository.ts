import { prisma } from "../../lib/prisma.js";
import {
  CreateWorkspace,
  WorkspaceIdParam,
  UpdateWorkspace,
} from "./workspace.types.js";

export async function isWorkspaceUser(workspaceId: string, userId: string) {
  const row = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      users: {
        some: {
          id: userId,
        },
      },
    },
    select: {
      id: true,
    },
  });
  return row !== null;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function isWorkspaceMemberEmail(workspaceId: string, email: string) {
  const row = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      users: { some: { email: { equals: email, mode: "insensitive" } } },
    },
    select: { id: true },
  });
  return row !== null;
}

export async function findPendingInvite(workspaceId: string, email: string) {
  return prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, email: true, token: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInvite(
  workspaceId: string,
  email: string,
  invitedById: string,
) {
  return prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      invitedById,
      token: crypto.randomUUID() + crypto.randomUUID().replaceAll("-", ""),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    select: { id: true, email: true, token: true, expiresAt: true },
  });
}

export async function findInviteByToken(token: string) {
  return prisma.workspaceInvite.findUnique({
    where: { token },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });
}

export async function acceptInvite(inviteId: string, workspaceId: string, userId: string) {
  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { users: { connect: { id: userId } } },
    }),
    prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date() },
    }),
  ]);
}

export async function getWorkspaceDefaultModel(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { defaultModel: true },
  });
  return workspace?.defaultModel ?? null;
}

export async function isWorkspaceOwner(workspaceId: string, userId: string) {
  const row = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      ownerId: userId,
    },
    select: {
      id: true,
    },
  });
  return row !== null;
}

export async function createWorkspace(userId: string, input: CreateWorkspace) {
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      ownerId: userId,
      defaultModel: input.defaultModel,
      users: {
        connect: {
          id: userId,
        },
      },
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });
  return workspace;
}

export async function updateWorkspace(
  ownerId: string,
  workspaceId: string,
  input: UpdateWorkspace,
) {
  const workspace = await prisma.workspace.update({
    where: {
      id: workspaceId,
      ownerId: ownerId,
    },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.defaultModel !== undefined && {
        defaultModel: input.defaultModel,
      }),
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });
  return workspace;
}

export async function deleteWorkspace(
  ownerId: string,
  input: WorkspaceIdParam,
) {
  await prisma.workspace.delete({
    where: {
      id: input.workspaceId,
      ownerId: ownerId,
    },
  });
}

export async function getAllWorkspaces(
  userId: string,
  limit: number,
  offset: number,
) {
  return prisma.workspace.findMany({
    where: {
      users: {
        some: {
          id: userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  return await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      users: {
        some: {
          id: userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      defaultModel: true,
      ownerId: true,
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      sources: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          error: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      chats: {
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      artifacts: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });
}
