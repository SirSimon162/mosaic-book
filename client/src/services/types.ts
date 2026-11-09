export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

export type ChatModel = (typeof CHAT_MODELS)[number];

export type UserRole = "ADMIN" | "USER";

export type SessionUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type RegisterBody = LoginBody & {
  firstName?: string;
  lastName?: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  ownerId: string;
};

export type WorkspacePage = {
  workspaces: WorkspaceSummary[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type Workspace = WorkspaceSummary & {
  defaultModel: ChatModel;
  users: SessionUser[];
};

export type SourceType = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";

export type SourceStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type WorkspaceSource = {
  id: string;
  title: string;
  type: SourceType;
  status: SourceStatus;
  error: string | null;
};

export type SourceDetail = WorkspaceSource & {
  source: string | null;
  url: string | null;
  fileUrl: string | null;
  metadata: unknown;
};

export type WorkspaceChat = {
  id: string;
  title: string;
};

export type ArtifactType =
  | "SUMMARY"
  | "TAKEAWAYS"
  | "FLASHCARDS"
  | "QUIZ"
  | "MINDMAP"
  | "REPORT";

export type ArtifactStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type WorkspaceArtifact = {
  id: string;
  title: string;
  type: ArtifactType;
  status: ArtifactStatus;
};

export type ArtifactDetail = WorkspaceArtifact & {
  error: string | null;
  sourceIds: string[];
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

export type CreateArtifactBody = {
  type: ArtifactType;
  title?: string;
  sourceIds?: string[];
};

export type WorkspaceInvite = {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
};

export type WorkspaceDetails = Workspace & {
  chats: WorkspaceChat[];
  sources: WorkspaceSource[];
  artifacts: WorkspaceArtifact[];
};

export type CreateWorkspaceBody = {
  name: string;
  defaultModel?: ChatModel;
};

export type UpdateWorkspaceBody = {
  name?: string;
  defaultModel?: ChatModel;
};

export type CreateSourceBody = {
  type: "TEXT" | "MARKDOWN";
  title: string;
  content: string;
};

export type ImportWebsiteBody = {
  url: string;
  title: string;
};

export type ImportYouTubeBody = {
  url: string;
  title: string;
};

export type Citation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  index: number;
  page: number | null;
  snippet: string;
  score: number;
};

export type ChatMessageRecord = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[] | null;
  createdAt: string;
};

export type ChatRecord = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ChatDetail = ChatRecord & {
  messages: ChatMessageRecord[];
};

export type ChatStreamEvent =
  | { type: "user"; message: ChatMessageRecord }
  | { type: "citations"; citations: Citation[] }
  | { type: "token"; text: string }
  | { type: "done"; message: ChatMessageRecord }
  | { type: "error"; message: string };

export type ListSourcesQuery = {
  q?: string;
  type?: SourceType;
  status?: SourceStatus;
};
