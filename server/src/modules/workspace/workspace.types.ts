import * as z from "zod";

export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

export const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  defaultModel: z.enum(CHAT_MODELS),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  defaultModel: z.enum(CHAT_MODELS).optional(),
})

export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;