import { prisma } from "../../lib/prisma.js";
import { CreateWorkspaceInput, SourceType } from "./workspace.types.js";

export async function createNewWorkspace(
  userId: string,
  input: CreateWorkspaceInput,
) {
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      ownerId: userId,
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

export async function getWorkspacesByUserId(userId: string) {
  const workspaces = await prisma.workspace.findMany({
    where: {
      users: {
        some: {
          id: userId,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  return workspaces;
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      users: {
        some: {
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
      chats: {
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      sources: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
        },
      },
    },
  });
  return workspace;
}

export async function createNewSource(workspaceId: string, type: SourceType, title: string, content: string) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type,
      title,
      source: content
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  })
  return source
}