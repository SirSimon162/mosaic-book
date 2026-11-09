import * as z from "zod";
import {
  UserRole,
  SourceType,
  ArtifactType,
  ArtifactStatus,
  SourceStatus,
} from "../../generated/prisma/enums.js";
import { CHAT_MODELS } from "../../lib/ai-config.js";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1),
  defaultModel: z.enum(CHAT_MODELS),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    defaultModel: z.enum(CHAT_MODELS).optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.defaultModel !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export const workspaceIdParamSchema = z.object({
  workspaceId: z.uuid(),
});

export const createInviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1).max(200),
});

export const publicInviteSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  token: z.string(),
  expiresAt: z.date(),
});

export const publicAcceptedInviteSchema = z.object({
  workspaceId: z.uuid(),
});

export const listWorkspacesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const publicWorkspacesSchema = z.object({
  workspaces: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      ownerId: z.uuid(),
    }),
  ),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});

export const publicWorkspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  defaultModel: z.enum(CHAT_MODELS),
  ownerId: z.uuid(),
  users: z.array(
    z.object({
      id: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.email(),
      role: z.enum(UserRole),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      type: z.enum(SourceType),
      status: z.enum(SourceStatus),
      error: z.string().nullable(),
    }),
  ),
  chats: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
    }),
  ),
  artifacts: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      type: z.enum(ArtifactType),
      status: z.enum(ArtifactStatus),
    }),
  ),
});

export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
export type PublicWorkspaces = z.infer<typeof publicWorkspacesSchema>;
export type PublicWorkspace = z.infer<typeof publicWorkspaceSchema>;
export type CreateInvite = z.infer<typeof createInviteSchema>;
export type AcceptInvite = z.infer<typeof acceptInviteSchema>;
export type PublicInvite = z.infer<typeof publicInviteSchema>;
export type PublicAcceptedInvite = z.infer<typeof publicAcceptedInviteSchema>;
