import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { PublicUser, UserRole } from "../auth/auth.types.js";
import { findUserById } from "./user.repository.js";

export async function getUserByUserId(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User not found", Status.NOT_FOUND);
  }
  return {
    ...user,
    role: user.role as UserRole,
  };
}
