import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { hashPassword, verifyPassword } from "../../utils/index.js";
import { createUser, findUserByEmail } from "./auth.repository.js";
import {
  LoginInput,
  PublicUser,
  RegisterInput,
  UserRole,
} from "./auth.types.js";

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  const parsedEmail = input.email.toLowerCase().trim();
  const user = await createUser({
    email: parsedEmail,
    passwordHash,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    role: UserRole.USER,
  });
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
  };
}

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new AppError("Invalid email or password", Status.UNAUTHORIZED);
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError("Invalid email or password", Status.UNAUTHORIZED);
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
  };
}
