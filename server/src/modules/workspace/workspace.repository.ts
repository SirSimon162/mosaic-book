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
