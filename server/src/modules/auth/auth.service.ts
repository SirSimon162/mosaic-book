import { hashPassword } from "../../utils/hash.js";
import { createUser } from "./auth.repository.js";
import { PublicUser, RegisterInput, UserRole } from "./auth.types.js";

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
