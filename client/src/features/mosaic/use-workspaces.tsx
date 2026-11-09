"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isAbort } from "@/services/api";
import { MOSAIC } from "@/services/mosaic";
import type {
  ChatModel,
  CreateSourceBody,
  Workspace,
  WorkspaceChat,
  WorkspaceDetails,
  WorkspaceSource,
  WorkspaceSummary,
} from "@/services/mosaic";

const PAGE_SIZE = 50;

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

function mergeSources(local: WorkspaceSource[], remote: WorkspaceSource[]) {
  const seen = new Set(remote.map((item) => item.id));
  const extras = local.filter((item) => !seen.has(item.id));
  return extras.length ? [...extras, ...remote] : remote;
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
  const request = MOSAIC.getWorkspace(id, signal).finally(() => {
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
      store(update(existing));
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
    if (!routeId || detailsRef.current[routeId]) return;
    const controller = new AbortController();
    let alive = true;
    setOpeningId(routeId);
    setError("");
    void loadDetails(routeId, controller.signal)
      .then((full) => {
        if (!alive) return;
        store(full);
      })
      .catch((cause: unknown) => {
        if (!alive || isAbort(cause)) return;
        setError(cause instanceof Error ? cause.message : "Could not open this workspace");
      })
      .finally(() => {
        if (alive) setOpeningId((current) => (current === routeId ? null : current));
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [routeId, store]);

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

  const active = routeId ? (details[routeId] ?? null) : null;
  const ingesting =
    active?.sources.some((source) => source.status === "PENDING" || source.status === "PROCESSING") ??
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
