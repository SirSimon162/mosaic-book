import { Prisma } from "../../generated/prisma/client.js";
import { MessageRole } from "../../generated/prisma/enums.js";
import { CHAT_MODELS, RECENT_MESSAGE_WINDOW } from "../../lib/ai-config.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import { completeFromSources, type ChatTurn } from "../../lib/openai.js";
import { searchWorkspaceSources } from "../source/source.service.js";
import { getWorkspaceDefaultModel } from "../workspace/workspace.repository.js";
import {
  createAssistantMessage,
  createChatInWorkspace,
  createUserMessage,
  deleteChatInWorkspace,
  getChatInWorkspace,
  listChatsInWorkspace,
  listRecentMessages,
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
const NO_SOURCE_REPLY =
  "I couldn't find that in the sources for this workspace.";

function chatModel(value: string): (typeof CHAT_MODELS)[number] {
  const match = CHAT_MODELS.find((model) => model === value);
  return match ?? "gpt-4o-mini";
}

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
  const user = await createUserMessage(workspaceId, chatId, data.content);
  if (!user) {
    throw new AppError("Chat not found", Status.NOT_FOUND);
  }

  const hits = await searchWorkspaceSources(workspaceId, {
    query: data.content,
  });

  let assistantContent = NO_SOURCE_REPLY;
  if (hits.length > 0) {
    const defaultModel = await getWorkspaceDefaultModel(workspaceId);
    if (!defaultModel) {
      throw new AppError("Workspace not found", Status.NOT_FOUND);
    }
    const recent = await listRecentMessages(chatId, RECENT_MESSAGE_WINDOW);
    const priorTurns: ChatTurn[] = recent
      .filter((message) => message.id !== user.id)
      .filter((message) => message.content !== STUB_ASSISTANT_REPLY)
      .map((message) => ({
        role: message.role === MessageRole.USER ? "user" : "assistant",
        content: message.content,
      }));
    assistantContent = await completeFromSources({
      model: chatModel(defaultModel),
      question: data.content,
      priorTurns,
      sources: hits,
    });
  }

  try {
    const assistant = await createAssistantMessage(
      chatId,
      assistantContent,
      hits,
    );
    return publicSendMessageSchema.parse({ user, assistant });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("Chat not found", Status.NOT_FOUND);
    }
    throw error;
  }
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
