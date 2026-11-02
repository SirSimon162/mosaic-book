import { Prisma } from "../../generated/prisma/client.js";
import { MessageRole } from "../../generated/prisma/enums.js";
import {
  CHAT_MODELS,
  CONVERSATION_SUMMARY_INTERVAL,
  RECENT_MESSAGE_WINDOW,
} from "../../lib/ai-config.js";
import { Status } from "../../lib/http-code.js";
import AppError from "../../lib/http-error.js";
import {
  streamFromSources,
  summarizeConversation,
  type ChatTurn,
} from "../../lib/openai.js";
import { ChunkSearchHit } from "../source/source.types.js";
import { searchWorkspaceSources } from "../source/source.service.js";
import { getWorkspaceDefaultModel } from "../workspace/workspace.repository.js";
import {
  createAssistantMessage,
  createChatInWorkspace,
  createUserMessage,
  deleteChatInWorkspace,
  getChatInWorkspace,
  getChatSummaryState,
  listChatTurns,
  listChatsInWorkspace,
  listRecentMessages,
  updateChatSummary,
} from "./chat.repository.js";
import {
  CreateChat,
  CreateMessage,
  PublicChat,
  PublicChatDetail,
  PublicListChats,
  PublicMessage,
  publicChatDetailSchema,
  publicChatSchema,
  publicListChatsSchema,
  publicMessageSchema,
} from "./chat.types.js";

const STUB_ASSISTANT_REPLY = "Not implemented yet.";
const NO_SOURCE_REPLY =
  "I couldn't find that in the sources for this workspace.";

function chatModel(value: string): (typeof CHAT_MODELS)[number] {
  const match = CHAT_MODELS.find((model) => model === value);
  return match ?? "gpt-4o-mini";
}

export type ChatStreamEvent =
  | { type: "user"; message: PublicMessage }
  | { type: "citations"; citations: ChunkSearchHit[] }
  | { type: "token"; text: string }
  | { type: "done"; message: PublicMessage };

function toTurn(role: MessageRole, content: string): ChatTurn {
  return {
    role: role === MessageRole.USER ? "user" : "assistant",
    content,
  };
}

async function maybeUpdateSummary(chatId: string, model: string) {
  const state = await getChatSummaryState(chatId);
  if (!state) {
    return;
  }
  const messages = await listChatTurns(chatId);
  const recentCount = Math.min(RECENT_MESSAGE_WINDOW, messages.length);
  const older = messages.slice(0, messages.length - recentCount);
  const unseen = older.slice(state.summaryMessageCount);
  if (unseen.length < CONVERSATION_SUMMARY_INTERVAL) {
    return;
  }

  const turns = unseen
    .filter((message) => message.content !== STUB_ASSISTANT_REPLY)
    .map((message) => toTurn(message.role, message.content));
  const summary =
    turns.length === 0
      ? state.summary
      : await summarizeConversation({
          model,
          previousSummary: state.summary,
          turns,
        });
  if (!summary) {
    await updateChatSummary(chatId, "", older.length);
    return;
  }
  await updateChatSummary(chatId, summary, older.length);
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

export async function* streamChatReply(
  workspaceId: string,
  chatId: string,
  data: CreateMessage,
  isAborted: () => boolean,
): AsyncGenerator<ChatStreamEvent> {
  const user = await createUserMessage(workspaceId, chatId, data.content);
  if (!user) {
    throw new AppError("Chat not found", Status.NOT_FOUND);
  }

  const defaultModel = await getWorkspaceDefaultModel(workspaceId);
  if (!defaultModel) {
    throw new AppError("Workspace not found", Status.NOT_FOUND);
  }
  const model = chatModel(defaultModel);
  yield { type: "user", message: publicMessageSchema.parse(user) };
  if (isAborted()) {
    return;
  }

  const hits = await searchWorkspaceSources(workspaceId, {
    query: data.content,
  });
  if (isAborted()) {
    return;
  }
  yield { type: "citations", citations: hits };

  const summaryState = await getChatSummaryState(chatId);
  const recent = await listRecentMessages(chatId, RECENT_MESSAGE_WINDOW);
  const priorTurns = recent
    .filter((message) => message.id !== user.id)
    .filter((message) => message.content !== STUB_ASSISTANT_REPLY)
    .map((message) => toTurn(message.role, message.content));

  let assistantContent = "";
  if (hits.length === 0) {
    assistantContent = NO_SOURCE_REPLY;
    yield { type: "token", text: assistantContent };
  } else {
    for await (const text of streamFromSources({
      model,
      question: data.content,
      priorTurns,
      sources: hits,
      summary: summaryState?.summary ?? null,
    })) {
      if (isAborted()) {
        return;
      }
      assistantContent += text;
      yield { type: "token", text };
    }
    if (!assistantContent.trim()) {
      throw new Error("Chat model returned an empty reply");
    }
  }

  if (isAborted()) {
    return;
  }

  let assistant;
  try {
    assistant = await createAssistantMessage(chatId, assistantContent, hits);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("Chat not found", Status.NOT_FOUND);
    }
    throw error;
  }

  yield { type: "done", message: publicMessageSchema.parse(assistant) };
  try {
    await maybeUpdateSummary(chatId, model);
  } catch (error) {
    console.error(error);
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
