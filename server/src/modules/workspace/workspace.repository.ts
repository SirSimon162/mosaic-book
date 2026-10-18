import { prisma } from "../../lib/prisma.js";
import { CreateWorkspace, WorkspaceIdParam, UpdateWorkspace } from "./workspace.types.js";

export async function createWorkspace(userId: string, input: CreateWorkspace) {
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      ownerId: userId,
      defaultModel: input.defaultModel,
      users: {
        connect: {
          id: userId
        }
      }
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        }
      }
    }
  })
  return workspace
}

export async function updateWorkspace(ownerId: string, workspaceId: string, input: UpdateWorkspace) {
  const workspace = await prisma.workspace.update({
    where: {
      id: workspaceId,
      ownerId: ownerId
    },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.defaultModel !== undefined && { defaultModel: input.defaultModel }),
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        }
      }
    }
  })
  return workspace
}

export async function deleteWorkspace(ownerId: string, input: WorkspaceIdParam) {
  await prisma.workspace.delete({
    where: {
      id: input.id,
      ownerId: ownerId
    }
  })
}