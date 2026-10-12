import { prisma } from "../../lib/prisma.js";
import { CreateWorkspaceInput, CreateSourceRow } from "./workspace.types.js";

export async function createNewWorkspace(
  userId: string,
  input: CreateWorkspaceInput,
) {
  try {
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
  } catch (e) {
    throw e
  }
}

export async function getWorkspacesByUserId(userId: string) {
  try {
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
  } catch (e) {
    throw e
  }
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  try {
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
  } catch (e) {
    throw e
  }
}

export async function createNewSource(
  workspaceId: string,
  row: CreateSourceRow,
) {
  try {
    const source = await prisma.source.create({
      data: {
        workspaceId,
        type: row.type,
        title: row.title,
        source: row.source,
        fileUrl: row.fileUrl,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return source;
  } catch (e) {
    throw e;
  }
}

export async function getSourceById(workspaceId: string, sourceId: string) {
  try {
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        workspaceId: workspaceId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        source: true,
        fileUrl: true,
      },
    });
    return source;
  } catch (e) {
    throw e
  }
}

export async function deleteSourceById(workspaceId: string, sourceId: string) {
  try {
    await prisma.source.delete({
      where: {
        id: sourceId,
        workspaceId: workspaceId
      }
    })
  } catch (e) {
    throw e
  }
}