import { Prisma } from "../../generated/prisma/client.js";
import { MessageRole } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ChunkSearchHit } from "../source/source.types.js";
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
  citations: true,
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

export async function createUserMessage(
  workspaceId: string,
  chatId: string,
  content: string,
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
        content,
      },
      select: messageSelect,
    });
    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
    return user;
  });
}

export async function listRecentMessages(chatId: string, limit: number) {
  const messages = await prisma.message.findMany({
    where: { chatId },
    select: messageSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return messages.reverse();
}

export async function getChatSummaryState(chatId: string) {
  return prisma.chat.findUnique({
    where: { id: chatId },
    select: { summary: true, summaryMessageCount: true },
  });
}

export async function listChatTurns(chatId: string) {
  return prisma.message.findMany({
    where: { chatId },
    select: { id: true, role: true, content: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateChatSummary(
  chatId: string,
  summary: string,
  summaryMessageCount: number,
) {
  return prisma.chat.update({
    where: { id: chatId },
    data: {
      summary,
      summaryMessageCount,
      summarizedAt: new Date(),
    },
    select: { id: true },
  });
}

export async function createAssistantMessage(
  chatId: string,
  content: string,
  citations: ChunkSearchHit[],
) {
  return prisma.$transaction(async (tx) => {
    const assistant = await tx.message.create({
      data: {
        chatId,
        role: MessageRole.ASSISTANT,
        content,
        citations: citations as Prisma.InputJsonValue,
      },
      select: messageSelect,
    });
    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
    return assistant;
  });
}
