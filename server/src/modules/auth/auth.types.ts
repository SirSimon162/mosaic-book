import * as z from "zod";

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .strict();

export const publicUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  role: z.enum(UserRole),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
};

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
};

export type PublicUser = z.infer<typeof publicUserSchema>;
