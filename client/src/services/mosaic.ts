import { request, serverEvents, withQuery } from "./api";
import type {
  ChatDetail,
  ChatMessageRecord,
  ChatModel,
  ChatRecord,
  ChatStreamEvent,
  Citation,
  CreateSourceBody,
  CreateWorkspaceBody,
  ImportWebsiteBody,
  ImportYouTubeBody,
  ListSourcesQuery,
  LoginBody,
  RegisterBody,
  SessionUser,
  SourceDetail,
  UpdateWorkspaceBody,
  Workspace,
  WorkspaceDetails,
  WorkspacePage,
  WorkspaceSource,
} from "./types";

const PAGE_SIZE = 50;
const BULK_LIMIT = 10;
const DEFAULT_MODEL: ChatModel = "gpt-4o-mini";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessage(value: unknown): value is ChatMessageRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.content === "string" &&
    (value.role === "USER" || value.role === "ASSISTANT")
  );
}

function asCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Citation => {
    if (!isRecord(item)) return false;
    return typeof item.chunkId === "string" && typeof item.sourceTitle === "string" && typeof item.snippet === "string";
  });
}

let sessionRequest: Promise<SessionUser | null> | null = null;

function workspacePath(id: string, suffix = "") {
  return `/api/workspace/${encodeURIComponent(id)}${suffix}`;
}

export const MOSAIC = {
  register(input: RegisterBody) {
    return request<SessionUser>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  login(input: LoginBody) {
    return request<SessionUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  logout() {
    return request<null>("/api/auth/logout", { method: "POST" });
  },

  me() {
    if (!sessionRequest) {
      sessionRequest = request<SessionUser | null>("/api/user/me", {
        allowUnauthorized: true,
      }).finally(() => {
        sessionRequest = null;
      });
    }
    return sessionRequest;
  },

  listWorkspaces(query?: { limit?: number; offset?: number }, signal?: AbortSignal) {
    return request<WorkspacePage>(
      withQuery("/api/workspace", {
        limit: query?.limit ?? PAGE_SIZE,
        offset: query?.offset ?? 0,
      }),
      { signal },
    );
  },

  createWorkspace(input: CreateWorkspaceBody) {
    return request<Workspace>("/api/workspace/create", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        defaultModel: input.defaultModel ?? DEFAULT_MODEL,
      }),
    });
  },

  updateWorkspace(id: string, input: UpdateWorkspaceBody) {
    return request<Workspace>(workspacePath(id), {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  deleteWorkspace(id: string) {
    return request<null>(workspacePath(id), { method: "DELETE" });
  },

  getWorkspace(id: string, signal?: AbortSignal) {
    return request<WorkspaceDetails>(workspacePath(id), { signal });
  },

  listSources(workspaceId: string, query?: ListSourcesQuery, signal?: AbortSignal) {
    return request<WorkspaceSource[]>(
      withQuery(workspacePath(workspaceId, "/source"), query),
      { signal },
    );
  },

  createSource(workspaceId: string, input: CreateSourceBody) {
    return request<WorkspaceSource>(workspacePath(workspaceId, "/source"), {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  importWebsite(workspaceId: string, input: ImportWebsiteBody) {
    return request<WorkspaceSource>(workspacePath(workspaceId, "/source/import/website"), {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  importYouTube(workspaceId: string, input: ImportYouTubeBody) {
    return request<WorkspaceSource>(workspacePath(workspaceId, "/source/import/youtube"), {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  importPdf(workspaceId: string, file: File, title: string) {
    const body = new FormData();
    body.append("file", file);
    body.append("title", title);
    return request<WorkspaceSource>(workspacePath(workspaceId, "/source/import/pdf"), {
      method: "POST",
      body,
    });
  },

  getSource(workspaceId: string, sourceId: string, signal?: AbortSignal) {
    return request<SourceDetail>(
      workspacePath(workspaceId, `/source/${encodeURIComponent(sourceId)}`),
      { signal },
    );
  },

  deleteSource(workspaceId: string, sourceId: string) {
    return request<null>(
      workspacePath(workspaceId, `/source/${encodeURIComponent(sourceId)}`),
      { method: "DELETE" },
    );
  },

  async deleteSources(workspaceId: string, sourceIds: string[]) {
    const unique = [...new Set(sourceIds)];
    if (unique.length === 0) return;
    if (unique.length === 1) {
      const sourceId = unique[0];
      if (!sourceId) return;
      await this.deleteSource(workspaceId, sourceId);
      return;
    }
    for (let index = 0; index < unique.length; index += BULK_LIMIT) {
      await request<null>(workspacePath(workspaceId, "/source/bulk-delete"), {
        method: "POST",
        body: JSON.stringify({ sourceIds: unique.slice(index, index + BULK_LIMIT) }),
      });
    }
  },

  async reprocessSources(workspaceId: string, sourceIds: string[]) {
    const unique = [...new Set(sourceIds)];
    for (let index = 0; index < unique.length; index += BULK_LIMIT) {
      await request<null>(workspacePath(workspaceId, "/source/reprocess"), {
        method: "POST",
        body: JSON.stringify({ sourceIds: unique.slice(index, index + BULK_LIMIT) }),
      });
    }
  },

  searchSources(
    workspaceId: string,
    input: { query: string; sourceIds?: string[] },
    signal?: AbortSignal,
  ) {
    return request<Citation[]>(workspacePath(workspaceId, "/source/search"), {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    });
  },

  listChats(workspaceId: string, signal?: AbortSignal) {
    return request<ChatRecord[]>(workspacePath(workspaceId, "/chat"), { signal });
  },

  createChat(workspaceId: string, input: { title: string }) {
    return request<ChatRecord>(workspacePath(workspaceId, "/chat"), {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getChat(workspaceId: string, chatId: string, signal?: AbortSignal) {
    return request<ChatDetail>(
      workspacePath(workspaceId, `/chat/${encodeURIComponent(chatId)}`),
      { signal },
    );
  },

  deleteChat(workspaceId: string, chatId: string) {
    return request<null>(workspacePath(workspaceId, `/chat/${encodeURIComponent(chatId)}`), {
      method: "DELETE",
    });
  },

  async *streamReply(
    workspaceId: string,
    chatId: string,
    input: { content: string; sourceIds?: string[] },
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const path = workspacePath(workspaceId, `/chat/${encodeURIComponent(chatId)}/messages`);
    for await (const item of serverEvents(path, { body: JSON.stringify(input), signal })) {
      const data = item.data;
      if (item.event === "user" && isRecord(data) && isMessage(data.message)) {
        yield { type: "user", message: data.message };
      } else if (item.event === "citations" && isRecord(data)) {
        yield { type: "citations", citations: asCitations(data.citations) };
      } else if (item.event === "token" && isRecord(data) && typeof data.text === "string") {
        yield { type: "token", text: data.text };
      } else if (item.event === "done" && isRecord(data) && isMessage(data.message)) {
        yield { type: "done", message: data.message };
      } else if (item.event === "error" && isRecord(data) && typeof data.message === "string") {
        yield { type: "error", message: data.message };
      }
    }
  },
};

export type {
  ArtifactType,
  ChatDetail,
  ChatMessageRecord,
  ChatModel,
  ChatRecord,
  ChatStreamEvent,
  Citation,
  CreateSourceBody,
  CreateWorkspaceBody,
  ImportWebsiteBody,
  ImportYouTubeBody,
  ListSourcesQuery,
  LoginBody,
  RegisterBody,
  SessionUser,
  SourceDetail,
  SourceStatus,
  SourceType,
  UpdateWorkspaceBody,
  Workspace,
  WorkspaceArtifact,
  WorkspaceChat,
  WorkspaceDetails,
  WorkspacePage,
  WorkspaceSource,
  WorkspaceSummary,
} from "./types";

export { CHAT_MODELS } from "./types";
