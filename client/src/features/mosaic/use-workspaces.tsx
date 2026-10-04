"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MOSAIC } from "@/services/mosaic";
import type { Workspace, WorkspaceDetails, WorkspaceSummary } from "@/services/mosaic";

function asDetails(workspace: Workspace): WorkspaceDetails {
  return { ...workspace, chats: [], sources: [] };
}

function summaryOf(workspace: Workspace): WorkspaceSummary {
  return { id: workspace.id, name: workspace.name, ownerId: workspace.ownerId };
}

type Boot = {
  workspaces: WorkspaceSummary[];
  entryId: string;
  seeded?: WorkspaceDetails;
};

let bootRequest: Promise<Boot> | null = null;

function bootWorkspaces() {
  if (!bootRequest) {
    bootRequest = (async () => {
      const list = await MOSAIC.listWorkspaces();
      if (list.length > 0) {
        return { workspaces: list, entryId: list[0].id };
      }
      const created = await MOSAIC.createWorkspace({ name: "My Mosaic" });
      return {
        workspaces: [summaryOf(created)],
        entryId: created.id,
        seeded: asDetails(created),
      };
    })().finally(() => {
      bootRequest = null;
    });
  }
  return bootRequest;
}

const detailsInflight = new Map<string, Promise<WorkspaceDetails>>();

function loadDetails(id: string) {
  const pending = detailsInflight.get(id);
  if (pending) return pending;
  const request = MOSAIC.getWorkspace(id).finally(() => {
    detailsInflight.delete(id);
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
  error: string;
  create: (name: string) => Promise<string>;
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
  const [error, setError] = useState("");
  const detailsRef = useRef(details);
  detailsRef.current = details;

  const store = useCallback((full: WorkspaceDetails) => {
    detailsRef.current = { ...detailsRef.current, [full.id]: full };
    setDetails(detailsRef.current);
  }, []);

  const reload = useCallback(async () => {
    setError("");
    try {
      const result = await bootWorkspaces();
      setWorkspaces(result.workspaces);
      setEntryId(result.entryId);
      if (result.seeded) store(result.seeded);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open your workspaces");
    } finally {
      setReady(true);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!routeId || detailsRef.current[routeId]) return;
    let alive = true;
    setOpeningId(routeId);
    setError("");
    void loadDetails(routeId)
      .then((full) => {
        if (!alive) return;
        store(full);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : "Could not open this workspace");
      })
      .finally(() => {
        if (alive) setOpeningId((current) => (current === routeId ? null : current));
      });
    return () => {
      alive = false;
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
      setError(cause instanceof Error ? cause.message : "Could not open this workspace");
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
      return created.id;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not create the workspace";
      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  }

  const active = routeId ? (details[routeId] ?? null) : null;

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
        error,
        create,
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
