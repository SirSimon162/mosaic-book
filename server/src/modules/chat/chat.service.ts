import { Prisma } from "../../generated/prisma/client.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import {
  createChatInWorkspace,
  createChatMessages,
  deleteChatInWorkspace,
  getChatInWorkspace,
  listChatsInWorkspace,
} from "./chat.repository.js";
import {
  CreateChat,
  CreateMessage,
  PublicChat,
  PublicChatDetail,
  PublicListChats,
  PublicSendMessage,
  publicChatDetailSchema,
  publicChatSchema,
  publicListChatsSchema,
  publicSendMessageSchema,
} from "./chat.types.js";

const STUB_ASSISTANT_REPLY = "Not implemented yet.";

export async function listChats(workspaceId: string): Promise<PublicListChats> {
  const chats = await listChatsInWorkspace(workspaceId);
  return publicListChatsSchema.parse(chats);
}

export async function createChat(
  workspaceId: string,
  data: CreateChat,
): Promise<PublicChat> {
  const chat = await createChatInWorkspace(workspaceId, data);
  return publicChatSchema.parse(chat);
}

export async function getChatById(
  workspaceId: string,
  chatId: string,
): Promise<PublicChatDetail> {
  const chat = await getChatInWorkspace(workspaceId, chatId);
  if (!chat) {
    throw new AppError("Chat not found", Status.NOT_FOUND);
  }
  return publicChatDetailSchema.parse(chat);
}

export async function sendMessage(
  workspaceId: string,
  chatId: string,
  data: CreateMessage,
): Promise<PublicSendMessage> {
  const messages = await createChatMessages(workspaceId, chatId, {
    userContent: data.content,
    assistantContent: STUB_ASSISTANT_REPLY,
  });
  if (!messages) {
    throw new AppError("Chat not found", Status.NOT_FOUND);
  }
  return publicSendMessageSchema.parse(messages);
}

export async function deleteChat(workspaceId: string, chatId: string) {
  try {
    await deleteChatInWorkspace(workspaceId, chatId);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new AppError("Chat not found", Status.NOT_FOUND);
    }
    throw e;
  }
}
