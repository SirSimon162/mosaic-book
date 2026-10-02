import { prisma } from "../../lib/prisma.js";

export async function findUserById(userId: string) {
    return prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
        }
    })
}