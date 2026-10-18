import * as z from "zod";

export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1),
  defaultModel: z.enum(CHAT_MODELS),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).optional(),
  defaultModel: z.enum(CHAT_MODELS).optional(),
}).refine((data) => data.name !== undefined || data.defaultModel !== undefined, {
  message: "At least one field must be provided",
})

export const workspaceIdParamSchema = z.object({
  id: z.uuid(),
})

export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>;