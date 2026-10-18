import { prisma } from "../../lib/prisma.js";

export async function createWorkspace(userId: string, name: string, defaultModel: string) {
  const workspace = prisma.workspace.create({
    data: {
      name,
      ownerId: userId,
      defaultModel,
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