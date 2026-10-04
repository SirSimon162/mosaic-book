import * as z from "zod";
import { publicUserSchema } from "../auth/auth.types.js";

export const WorkspaceNameSchema = z.string().trim().min(3).max(20);

export const createWorkspaceSchema = z
  .object({ name: WorkspaceNameSchema })
  .strict();

export const updateWorkspaceSchema = z
  .object({
    name: WorkspaceNameSchema,
  })
  .strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const publicWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  users: z.array(publicUserSchema),
});

export type PublicWorkspace = z.infer<typeof publicWorkspaceSchema>;

export const publicWorkspacesListSchema = publicWorkspaceSchema.omit({
  users: true,
});

export type PublicWorkspacesList = z.infer<typeof publicWorkspacesListSchema>;

export enum SourceType {
  TEXT = "TEXT",
  MARKDOWN = "MARKDOWN",
  PDF = "PDF",
  DOC = "DOC",
  CSV = "CSV",
  YOUTUBE = "YOUTUBE",
  WEBSITE = "WEBSITE",
}

export enum SourceStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export const publicWorkspaceDetailsSchema = publicWorkspaceSchema.extend({
  chats: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(SourceType),
      status: z.enum(SourceStatus),
    }),
  ),
});

export type PublicWorkspaceDetails = z.infer<
  typeof publicWorkspaceDetailsSchema
>;
