import * as z from "zod";
import { MessageRole } from "../../generated/prisma/enums.js";

export const messageRoleSchema = z.enum(MessageRole);

export const chatIdParamSchema = z.object({
  workspaceId: z.uuid(),
  chatId: z.uuid(),
});

export const createChatSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .default("New Chat"),
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1, "Content is required"),
});

export const publicMessageSchema = z.object({
  id: z.uuid(),
  role: messageRoleSchema,
  content: z.string(),
  createdAt: z.date(),
});

export const publicChatSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  updatedAt: z.date(),
});

export const publicChatDetailSchema = publicChatSchema.extend({
  messages: z.array(publicMessageSchema),
});

export const publicListChatsSchema = z.array(publicChatSchema);

export const publicSendMessageSchema = z.object({
  user: publicMessageSchema,
  assistant: publicMessageSchema,
});

export type ChatIdParam = z.infer<typeof chatIdParamSchema>;
export type CreateChat = z.infer<typeof createChatSchema>;
export type CreateMessage = z.infer<typeof createMessageSchema>;
export type PublicMessage = z.infer<typeof publicMessageSchema>;
export type PublicChat = z.infer<typeof publicChatSchema>;
export type PublicChatDetail = z.infer<typeof publicChatDetailSchema>;
export type PublicListChats = z.infer<typeof publicListChatsSchema>;
export type PublicSendMessage = z.infer<typeof publicSendMessageSchema>;
