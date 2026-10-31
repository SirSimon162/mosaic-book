import { MessageRole } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { CreateChat } from "./chat.types.js";

const chatListSelect = {
  id: true,
  title: true,
  updatedAt: true,
} as const;

const messageSelect = {
  id: true,
  role: true,
  content: true,
  createdAt: true,
} as const;

function chatInWorkspace(workspaceId: string, chatId: string) {
  return { workspaceId, id: chatId };
}

export async function createChatInWorkspace(
  workspaceId: string,
  data: CreateChat,
) {
  return prisma.chat.create({
    data: {
      workspaceId,
      title: data.title,
    },
    select: chatListSelect,
  });
}

export async function listChatsInWorkspace(workspaceId: string) {
  return prisma.chat.findMany({
    where: { workspaceId },
    select: chatListSelect,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getChatInWorkspace(workspaceId: string, chatId: string) {
  return prisma.chat.findFirst({
    where: chatInWorkspace(workspaceId, chatId),
    select: {
      ...chatListSelect,
      messages: {
        select: messageSelect,
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function deleteChatInWorkspace(
  workspaceId: string,
  chatId: string,
) {
  return prisma.chat.delete({
    where: chatInWorkspace(workspaceId, chatId),
    select: { id: true },
  });
}

export async function createChatMessages(
  workspaceId: string,
  chatId: string,
  data: { userContent: string; assistantContent: string },
) {
  return prisma.$transaction(async (tx) => {
    const chat = await tx.chat.findFirst({
      where: chatInWorkspace(workspaceId, chatId),
      select: { id: true },
    });
    if (!chat) {
      return null;
    }

    const user = await tx.message.create({
      data: {
        chatId,
        role: MessageRole.USER,
        content: data.userContent,
      },
      select: messageSelect,
    });
    const assistant = await tx.message.create({
      data: {
        chatId,
        role: MessageRole.ASSISTANT,
        content: data.assistantContent,
      },
      select: messageSelect,
    });
    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return { user, assistant };
  });
}
