"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isAbort } from "@/services/api";
import { MOSAIC } from "@/services/mosaic";
import type {
  ArtifactDetail,
  ArtifactType,
  ChatModel,
  CreateSourceBody,
  Workspace,
  WorkspaceChat,
  WorkspaceDetails,
  WorkspaceInvite,
  WorkspaceSource,
  WorkspaceSummary,
} from "@/services/mosaic";

const PAGE_SIZE = 50;
const EMPTY_ARTIFACTS: Record<string, ArtifactDetail> = {};

function modelOf(value: string | undefined): ChatModel {
  return value === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini";
}

function asDetails(workspace: Workspace): WorkspaceDetails {
  return {
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    defaultModel: modelOf(workspace.defaultModel),
    users: workspace.users ?? [],
    chats: [],
    sources: [],
    artifacts: [],
  };
}

function summaryOf(workspace: Workspace): WorkspaceSummary {
  return { id: workspace.id, name: workspace.name, ownerId: workspace.ownerId };
}

function mergeSources(local: WorkspaceSource[] | undefined, remote: WorkspaceSource[]) {
  const current = Array.isArray(local) ? local : [];
  const next = Array.isArray(remote) ? remote : [];
  const seen = new Set(next.map((item) => item.id));
  const extras = current.filter((item) => !seen.has(item.id));
  return extras.length ? [...extras, ...next] : next;
}

function mergeChats(local: WorkspaceChat[], remote: WorkspaceChat[]) {
  const seen = new Set(remote.map((item) => item.id));
  const extras = local.filter((item) => !seen.has(item.id));
  return extras.length ? [...extras, ...remote] : remote;
}

function messageOf(cause: unknown, fallback: string) {
  if (isAbort(cause)) return null;
  return cause instanceof Error ? cause.message : fallback;
}

type Boot = {
  workspaces: WorkspaceSummary[];
  entryId: string;
  seeded?: WorkspaceDetails;
  nextOffset: number;
  hasMore: boolean;
};

let bootRequest: Promise<Boot> | null = null;

function bootWorkspaces() {
  if (!bootRequest) {
    bootRequest = (async () => {
      const page = await MOSAIC.listWorkspaces({ limit: PAGE_SIZE, offset: 0 });
      const first = page.workspaces[0];
      if (first) {
        return {
          workspaces: page.workspaces,
          entryId: first.id,
          nextOffset: page.offset + page.workspaces.length,
          hasMore: page.hasMore,
        };
      }
      const created = await MOSAIC.createWorkspace({ name: "My Mosaic" });
      return {
        workspaces: [summaryOf(created)],
        entryId: created.id,
        seeded: asDetails(created),
        nextOffset: 0,
        hasMore: false,
      };
    })().finally(() => {
      bootRequest = null;
    });
  }
  return bootRequest;
}

const detailsInflight = new Map<string, Promise<WorkspaceDetails>>();

function loadDetails(id: string, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  const pending = detailsInflight.get(id);
  if (pending) return pending;
  const request = (async () => {
    const full = await MOSAIC.getWorkspace(id, signal);
    const carried = Array.isArray(full.sources) ? full.sources : [];
    try {
      const listed = await MOSAIC.listSources(id, undefined, signal);
      return { ...full, sources: listed };
    } catch (cause) {
      if (isAbort(cause)) throw cause;
      return { ...full, sources: carried };
    }
  })().finally(() => {
    if (detailsInflight.get(id) === request) detailsInflight.delete(id);
  });
  detailsInflight.set(id, request);
  return request;
}

type WorkspaceContextValue = {
  workspaces: WorkspaceSummary[];
  entryId: string | null;
  routeId: string | null;
  active: WorkspaceDetails | null;
  name: string;
  ready: boolean;
  opening: boolean;
  creating: boolean;
  saving: boolean;
  removing: boolean;
  error: string;
  create: (name: string) => Promise<string>;
  rename: (name: string) => Promise<void>;
  setModel: (model: ChatModel) => Promise<void>;
  remove: () => Promise<string>;
  importPdf: (file: File, title: string) => Promise<void>;
  importWebsite: (url: string, title: string) => Promise<void>;
  importYouTube: (url: string, title: string) => Promise<void>;
  createNote: (input: CreateSourceBody) => Promise<void>;
  deleteSources: (ids: string[]) => Promise<void>;
  reprocessSources: (ids: string[]) => Promise<void>;
  refreshSources: () => Promise<void>;
  placeChat: (chat: WorkspaceChat) => void;
  removeChat: (chatId: string) => void;
  replaceChats: (chats: WorkspaceChat[]) => void;
  artifactDetails: Record<string, ArtifactDetail>;
  createArtifact: (
    type: ArtifactType,
    input?: { title?: string; sourceIds?: string[] },
  ) => Promise<ArtifactDetail>;
  loadArtifact: (artifactId: string) => Promise<ArtifactDetail | null>;
  createInvite: (email: string) => Promise<WorkspaceInvite>;
  acceptInvite: (token: string) => Promise<string>;
  reload: () => Promise<void>;
  reopen: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeId = /^\/mosaic\/([^/]+)$/.exec(pathname)?.[1] ?? null;
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, WorkspaceDetails>>({});
  const [artifactCache, setArtifactCache] = useState<Record<string, Record<string, ArtifactDetail>>>({});
  const artifactFlights = useRef(new Map<string, Promise<ArtifactDetail | null>>());
  const [ready, setReady] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const detailsRef = useRef(details);
  const restToken = useRef(0);

  const store = useCallback((full: WorkspaceDetails) => {
    detailsRef.current = { ...detailsRef.current, [full.id]: full };
    setDetails(detailsRef.current);
  }, []);

  const patch = useCallback(
    (id: string, update: (current: WorkspaceDetails) => WorkspaceDetails) => {
      const existing = detailsRef.current[id];
      if (!existing) return;
      const next = update(existing);
      if (next === existing) return;
      store(next);
    },
    [store],
  );

  const forget = useCallback((id: string) => {
    if (!detailsRef.current[id]) return;
    const next = { ...detailsRef.current };
    delete next[id];
    detailsRef.current = next;
    setDetails(next);
  }, []);

  const touch = useCallback((id: string, fields: Partial<Pick<WorkspaceSummary, "name">>) => {
    setWorkspaces((current) => {
      const match = current.find((item) => item.id === id);
      if (!match) return current;
      return [{ ...match, ...fields }, ...current.filter((item) => item.id !== id)];
    });
  }, []);

  const loadRemaining = useCallback(async (start: number, token: number) => {
    let offset = start;
    let hasMore = true;
    while (hasMore && token === restToken.current) {
      try {
        const page = await MOSAIC.listWorkspaces({ limit: PAGE_SIZE, offset });
        if (token !== restToken.current || page.workspaces.length === 0) return;
        setWorkspaces((current) => {
          const seen = new Set(current.map((item) => item.id));
          const extra = page.workspaces.filter((item) => !seen.has(item.id));
          return extra.length ? [...current, ...extra] : current;
        });
        hasMore = page.hasMore;
        offset += page.workspaces.length;
      } catch (cause) {
        if (isAbort(cause)) return;
        return;
      }
    }
  }, []);

  const reload = useCallback(async () => {
    const token = ++restToken.current;
    try {
      const result = await bootWorkspaces();
      if (token !== restToken.current) return;
      setError("");
      setWorkspaces(result.workspaces);
      setEntryId(result.entryId);
      if (result.seeded) store(result.seeded);
      if (result.hasMore) void loadRemaining(result.nextOffset, token);
    } catch (cause) {
      const message = messageOf(cause, "Could not open your workspaces");
      if (message) setError(message);
    } finally {
      if (token === restToken.current) setReady(true);
    }
  }, [loadRemaining, store]);

  useEffect(() => {
    const token = ++restToken.current;
    void bootWorkspaces()
      .then((result) => {
        if (token !== restToken.current) return;
        setError("");
        setWorkspaces(result.workspaces);
        setEntryId(result.entryId);
        if (result.seeded) store(result.seeded);
        if (result.hasMore) void loadRemaining(result.nextOffset, token);
      })
      .catch((cause: unknown) => {
        if (token !== restToken.current) return;
        const message = messageOf(cause, "Could not open your workspaces");
        if (message) setError(message);
      })
      .finally(() => {
        if (token === restToken.current) setReady(true);
      });
    return () => {
      restToken.current += 1;
    };
  }, [loadRemaining, store]);

  useEffect(() => {
    if (!routeId) return;
    let alive = true;
    const known = detailsRef.current[routeId];
    if (!known) {
      setOpeningId(routeId);
      setError("");
    }
    void (async () => {
      if (!detailsRef.current[routeId]) {
        const full = await loadDetails(routeId);
        if (!alive) return;
        store(full);
        return;
      }
      const listed = await MOSAIC.listSources(routeId);
      if (!alive) return;
      patch(routeId, (workspace) => ({ ...workspace, sources: listed }));
    })()
      .catch((cause: unknown) => {
        if (!alive || isAbort(cause) || detailsRef.current[routeId]) return;
        setError(cause instanceof Error ? cause.message : "Could not open this workspace");
      })
      .finally(() => {
        if (alive) setOpeningId((current) => (current === routeId ? null : current));
      });
    return () => {
      alive = false;
    };
  }, [routeId, store, patch]);

  const reopen = useCallback(async () => {
    if (!routeId) {
      await reload();
      return;
    }
    setError("");
    setOpeningId(routeId);
    try {
      store(await loadDetails(routeId));
    } catch (cause) {
      const message = messageOf(cause, "Could not open this workspace");
      if (message) setError(message);
    } finally {
      setOpeningId((current) => (current === routeId ? null : current));
    }
  }, [reload, routeId, store]);

  async function create(name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      throw new Error("Use 3 to 20 characters");
    }
    setCreating(true);
    setError("");
    try {
      const created = await MOSAIC.createWorkspace({ name: trimmed });
      setWorkspaces((current) => [
        summaryOf(created),
        ...current.filter((item) => item.id !== created.id),
      ]);
      store(asDetails(created));
      setEntryId((current) => current ?? created.id);
      return created.id;
    } catch (cause) {
      const message = messageOf(cause, "Could not create the workspace") ?? "Could not create the workspace";
      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  }

  async function rename(name: string) {
    if (!routeId) throw new Error("Open a workspace first");
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      throw new Error("Use 3 to 20 characters");
    }
    if (detailsRef.current[routeId]?.name === trimmed) return;
    setSaving(true);
    setError("");
    try {
      const updated = await MOSAIC.updateWorkspace(routeId, { name: trimmed });
      touch(routeId, { name: updated.name });
      patch(routeId, (workspace) => ({
        ...workspace,
        name: updated.name,
        defaultModel: modelOf(updated.defaultModel),
      }));
    } catch (cause) {
      const message = messageOf(cause, "Could not rename the workspace") ?? "Could not rename the workspace";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }

  async function setModel(next: ChatModel) {
    if (!routeId) throw new Error("Open a workspace first");
    if (detailsRef.current[routeId]?.defaultModel === next) return;
    setSaving(true);
    setError("");
    try {
      const updated = await MOSAIC.updateWorkspace(routeId, { defaultModel: next });
      touch(routeId, { name: updated.name });
      patch(routeId, (workspace) => ({
        ...workspace,
        name: updated.name,
        defaultModel: modelOf(updated.defaultModel),
      }));
    } catch (cause) {
      const message = messageOf(cause, "Could not update the workspace") ?? "Could not update the workspace";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!routeId) throw new Error("Open a workspace first");
    setRemoving(true);
    setError("");
    try {
      await MOSAIC.deleteWorkspace(routeId);
      const rest = workspaces.filter((item) => item.id !== routeId);
      forget(routeId);
      setWorkspaces(rest);
      const next = rest[0];
      if (next) {
        setEntryId((current) => (current === routeId ? next.id : current));
        return next.id;
      }
      const created = await MOSAIC.createWorkspace({ name: "My Mosaic" });
      setWorkspaces([summaryOf(created)]);
      store(asDetails(created));
      setEntryId(created.id);
      return created.id;
    } catch (cause) {
      const message = messageOf(cause, "Could not delete the workspace") ?? "Could not delete the workspace";
      setError(message);
      throw new Error(message);
    } finally {
      setRemoving(false);
    }
  }

  function requireWorkspace() {
    if (!routeId) throw new Error("Open a workspace first");
    return routeId;
  }

  async function importPdf(file: File, title: string) {
    const id = requireWorkspace();
    const source = await MOSAIC.importPdf(id, file, title);
    patch(id, (workspace) => ({
      ...workspace,
      sources: [source, ...workspace.sources.filter((item) => item.id !== source.id)],
    }));
  }

  async function importWebsite(url: string, title: string) {
    const id = requireWorkspace();
    const source = await MOSAIC.importWebsite(id, { url, title });
    patch(id, (workspace) => ({
      ...workspace,
      sources: [source, ...workspace.sources.filter((item) => item.id !== source.id)],
    }));
  }

  async function importYouTube(url: string, title: string) {
    const id = requireWorkspace();
    const source = await MOSAIC.importYouTube(id, { url, title });
    patch(id, (workspace) => ({
      ...workspace,
      sources: [source, ...workspace.sources.filter((item) => item.id !== source.id)],
    }));
  }

  async function createNote(input: CreateSourceBody) {
    const id = requireWorkspace();
    const source = await MOSAIC.createSource(id, input);
    patch(id, (workspace) => ({
      ...workspace,
      sources: [source, ...workspace.sources.filter((item) => item.id !== source.id)],
    }));
  }

  async function deleteSources(ids: string[]) {
    const id = requireWorkspace();
    if (ids.length === 0) return;
    try {
      await MOSAIC.deleteSources(id, ids);
      const gone = new Set(ids);
      patch(id, (workspace) => ({
        ...workspace,
        sources: workspace.sources.filter((item) => !gone.has(item.id)),
      }));
    } catch (cause) {
      try {
        const sources = await MOSAIC.listSources(id);
        patch(id, (workspace) => ({
          ...workspace,
          sources: mergeSources(workspace.sources, sources),
        }));
      } catch {
        // Keep the list we already have. The thrown error is what the panel shows.
      }
      throw cause;
    }
  }

  async function reprocessSources(ids: string[]) {
    const id = requireWorkspace();
    if (ids.length === 0) return;
    await MOSAIC.reprocessSources(id, ids);
    const marked = new Set(ids);
    patch(id, (workspace) => ({
      ...workspace,
      sources: workspace.sources.map((source) =>
        marked.has(source.id) ? { ...source, status: "PENDING", error: null } : source,
      ),
    }));
  }

  async function refreshSources() {
    const id = requireWorkspace();
    const sources = await MOSAIC.listSources(id);
    patch(id, (workspace) => ({
      ...workspace,
      sources: mergeSources(workspace.sources, sources),
    }));
  }

  async function createArtifact(
    type: ArtifactType,
    input?: { title?: string; sourceIds?: string[] },
  ) {
    const id = requireWorkspace();
    const title = input?.title?.trim();
    const sourceIds = [...new Set(input?.sourceIds ?? [])].slice(0, 50);
    const detail = await MOSAIC.createArtifact(id, {
      type,
      ...(title ? { title: title.slice(0, 200) } : {}),
      ...(sourceIds.length > 0 ? { sourceIds } : {}),
    });
    rememberArtifact(id, detail);
    return detail;
  }

  async function createInvite(email: string) {
    const id = requireWorkspace();
    return MOSAIC.createInvite(id, email.trim().toLowerCase());
  }

  const placeChat = useCallback(
    (chat: WorkspaceChat) => {
      if (!routeId) return;
      patch(routeId, (workspace) => ({
        ...workspace,
        chats: [chat, ...workspace.chats.filter((item) => item.id !== chat.id)],
      }));
    },
    [patch, routeId],
  );

  const removeChat = useCallback(
    (chatId: string) => {
      if (!routeId) return;
      patch(routeId, (workspace) => ({
        ...workspace,
        chats: workspace.chats.filter((item) => item.id !== chatId),
      }));
    },
    [patch, routeId],
  );

  const replaceChats = useCallback(
    (chats: WorkspaceChat[]) => {
      if (!routeId) return;
      patch(routeId, (workspace) => ({
        ...workspace,
        chats: mergeChats(workspace.chats, chats),
      }));
    },
    [patch, routeId],
  );

  const rememberArtifact = useCallback(
    (workspaceId: string, detail: ArtifactDetail) => {
      setArtifactCache((current) => {
        const bucket = current[workspaceId] ?? {};
        const previous = bucket[detail.id];
        if (
          previous &&
          previous.status === detail.status &&
          previous.updatedAt === detail.updatedAt &&
          previous.error === detail.error
        ) {
          return current;
        }
        return { ...current, [workspaceId]: { ...bucket, [detail.id]: detail } };
      });
      const summary = {
        id: detail.id,
        title: detail.title,
        type: detail.type,
        status: detail.status,
      };
      patch(workspaceId, (workspace) => {
        const current = workspace.artifacts.find((item) => item.id === detail.id);
        if (current && current.status === summary.status && current.title === summary.title) {
          return workspace;
        }
        const exists = workspace.artifacts.some((item) => item.id === detail.id);
        return {
          ...workspace,
          artifacts: exists
            ? workspace.artifacts.map((item) => (item.id === detail.id ? summary : item))
            : [summary, ...workspace.artifacts],
        };
      });
    },
    [patch],
  );

  const loadArtifact = useCallback(
    (artifactId: string) => {
      if (!routeId) return Promise.resolve(null);
      const workspaceId = routeId;
      const key = `${workspaceId}:${artifactId}`;
      const existing = artifactFlights.current.get(key);
      if (existing) return existing;
      const job = MOSAIC.getArtifact(workspaceId, artifactId)
        .then((detail) => {
          rememberArtifact(workspaceId, detail);
          return detail;
        })
        .finally(() => {
          if (artifactFlights.current.get(key) === job) artifactFlights.current.delete(key);
        });
      artifactFlights.current.set(key, job);
      return job;
    },
    [rememberArtifact, routeId],
  );

  const acceptInvite = useCallback(
    async (token: string) => {
      const accepted = await MOSAIC.acceptInvite(token.trim());
      const generation = ++restToken.current;
      const [full, page] = await Promise.all([
        MOSAIC.getWorkspace(accepted.workspaceId),
        MOSAIC.listWorkspaces({ limit: PAGE_SIZE, offset: 0 }),
      ]);
      if (generation !== restToken.current) return full.id;
      store(full);
      const summary = { id: full.id, name: full.name, ownerId: full.ownerId };
      setWorkspaces(
        page.workspaces.some((item) => item.id === full.id)
          ? page.workspaces
          : [summary, ...page.workspaces],
      );
      setEntryId((current) => current ?? full.id);
      setReady(true);
      if (page.hasMore) void loadRemaining(page.offset + page.workspaces.length, generation);
      return full.id;
    },
    [loadRemaining, store],
  );

  const active = routeId ? (details[routeId] ?? null) : null;
  const artifactDetails = (routeId && artifactCache[routeId]) || EMPTY_ARTIFACTS;
  const ingesting =
    active?.sources.some((source) => source.status === "PENDING" || source.status === "PROCESSING") ??
    false;
  const generating =
    active?.artifacts.some((item) => item.status === "PENDING" || item.status === "PROCESSING") ??
    false;

  useEffect(() => {
    if (!routeId || !ingesting) return;
    let stopped = false;
    let timer = 0;
    const tick = () => {
      timer = window.setTimeout(() => {
        if (stopped) return;
        if (document.hidden) {
          tick();
          return;
        }
        void MOSAIC.listSources(routeId)
          .then((sources) => {
            if (stopped) return;
            patch(routeId, (workspace) => ({
              ...workspace,
              sources: mergeSources(workspace.sources, sources),
            }));
          })
          .catch((cause: unknown) => {
            if (!isAbort(cause)) return;
          })
          .finally(() => {
            if (!stopped) tick();
          });
      }, 4000);
    };
    tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [ingesting, patch, routeId]);

  useEffect(() => {
    if (!routeId || !generating) return;
    let stopped = false;
    let timer = 0;
    const tick = () => {
      timer = window.setTimeout(() => {
        if (stopped) return;
        if (document.hidden) {
          tick();
          return;
        }
        const pending = (detailsRef.current[routeId]?.artifacts ?? []).filter(
          (item) => item.status === "PENDING" || item.status === "PROCESSING",
        );
        if (pending.length === 0) return;
        void Promise.all(pending.map((item) => loadArtifact(item.id).catch(() => null))).finally(() => {
          if (!stopped) tick();
        });
      }, 4000);
    };
    tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [generating, loadArtifact, routeId]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        entryId,
        routeId,
        active,
        name: workspaces.find((item) => item.id === routeId)?.name ?? active?.name ?? "",
        ready,
        opening: Boolean(routeId && openingId === routeId && !active),
        creating,
        saving,
        removing,
        error,
        create,
        rename,
        setModel,
        remove,
        importPdf,
        importWebsite,
        importYouTube,
        createNote,
        deleteSources,
        reprocessSources,
        refreshSources,
        placeChat,
        removeChat,
        replaceChats,
        artifactDetails,
        createArtifact,
        loadArtifact,
        createInvite,
        acceptInvite,
        reload,
        reopen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("Workspace is unavailable");
  }
  return value;
}
