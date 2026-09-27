import { CreateUserInput } from "./auth.types.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import AppError from "../../lib/http-error.js";
import { Status } from "../../lib/http-code.js";

export async function createUser(input: CreateUserInput) {
  const { email, passwordHash, firstName, lastName, role } = input;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        role,
      },
    });
    return user;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new AppError(
        "An account with this email already exists.",
        Status.CONFLICT,
      );
    }
    throw e;
  }
}

export async function findUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    });
    return user;
  } catch (e) {
    throw e;
  }
}
