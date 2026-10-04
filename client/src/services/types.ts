export type SessionUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
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

export type Workspace = WorkspaceSummary & {
  users: SessionUser[];
};

export type WorkspaceSource = {
  id: string;
  title: string;
  type: "TEXT" | "MARKDOWN" | "PDF" | "DOC" | "CSV" | "YOUTUBE" | "WEBSITE";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
};

export type WorkspaceChat = {
  id: string;
  title: string;
};

export type WorkspaceDetails = Workspace & {
  chats: WorkspaceChat[];
  sources: WorkspaceSource[];
};

export type CreateWorkspaceBody = {
  name: string;
};
