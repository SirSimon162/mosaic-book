import { request } from "./api";
import type {
  CreateWorkspaceBody,
  LoginBody,
  RegisterBody,
  SessionUser,
  Workspace,
  WorkspaceDetails,
  WorkspaceSummary,
} from "./types";

let sessionRequest: Promise<SessionUser | null> | null = null;

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

  listWorkspaces() {
    return request<WorkspaceSummary[]>("/api/workspace");
  },

  createWorkspace(input: CreateWorkspaceBody) {
    return request<Workspace>("/api/workspace/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getWorkspace(id: string) {
    return request<WorkspaceDetails>(`/api/workspace/${encodeURIComponent(id)}`);
  },
};

export type {
  CreateWorkspaceBody,
  LoginBody,
  RegisterBody,
  SessionUser,
  Workspace,
  WorkspaceChat,
  WorkspaceDetails,
  WorkspaceSource,
  WorkspaceSummary,
} from "./types";
