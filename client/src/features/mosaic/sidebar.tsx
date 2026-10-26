"use client";

import { BookOpen, Check, ChevronDown, MessageSquare, PanelLeft, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/features/auth/session";
import { ThemeIcon } from "@/features/shell/navbar/theme-switch";
import { CHAT_MODELS, type ChatModel, type WorkspaceChat, type WorkspaceSummary } from "@/services/mosaic";
import { Brand } from "@/shared/branding/brand";
import { Mark } from "@/shared/branding/mark";
import type { Mode } from "./data";

const modes: { id: Mode; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "learn", label: "Learn", icon: BookOpen },
];

export function Sidebar({
  mode,
  chatId,
  workspaces,
  activeId,
  name,
  chats,
  model,
  creating,
  saving,
  removing,
  canManage,
  error,
  onMode,
  onChat,
  onWorkspace,
  onCreate,
  onRename,
  onDelete,
  onModel,
}: {
  mode: Mode;
  chatId: string | null;
  workspaces: WorkspaceSummary[];
  activeId: string | null;
  name: string;
  model: ChatModel;
  chats: WorkspaceChat[];
  creating: boolean;
  saving: boolean;
  removing: boolean;
  canManage: boolean;
  error: string;
  onMode: (mode: Mode) => void;
  onChat: (id: string) => void;
  onWorkspace: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onModel: (model: ChatModel) => Promise<void>;
}) {
  const { leaving, logout } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    if (!expanded) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  function collapse() {
    setExpanded(false);
  }

  async function leave() {
    setLeaveError("");
    try {
      await logout();
    } catch (cause) {
      setLeaveError(cause instanceof Error ? cause.message : "Could not log out");
    }
  }

  return (
    <>
      <nav
        aria-label="Workspace"
        className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-primary bg-secondary py-3 md:hidden"
      >
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() => setExpanded(true)}
          className="grid size-10 place-items-center rounded-lg text-primary hover:bg-primary"
        >
          <PanelLeft className="size-5" />
        </button>
        <Link href="/" aria-label="Home" className="grid size-10 place-items-center">
          <Mark className="size-5" />
        </Link>
        {modes.map((item) => {
          const Icon = item.icon;
          const selected = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={() => onMode(item.id)}
              className={`grid size-10 place-items-center rounded-lg ${
                selected ? "bg-tertiary text-primary" : "text-secondary hover:bg-primary hover:text-primary"
              }`}
            >
              <Icon className={`size-4 ${selected ? "text-accent" : ""}`} strokeWidth={1.75} />
            </button>
          );
        })}
        <div className="mt-auto">
          <ThemeIcon />
        </div>
      </nav>

      {expanded && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={collapse}
          className="fixed inset-0 z-30 bg-[var(--bg-inverse)]/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-3.5rem))] flex-col border-r border-primary bg-secondary transition-transform md:static md:z-auto md:h-full md:w-[280px] md:translate-x-0 ${
          expanded ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex">
            <Brand className="h-6" />
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={collapse}
            className="grid size-9 place-items-center rounded-lg text-secondary hover:bg-primary hover:text-primary md:hidden"
          >
            <PanelLeft className="size-5" />
          </button>
        </div>
        <WorkspaceSwitch
          workspaces={workspaces}
          activeId={activeId}
          name={name}
          model={model}
          creating={creating}
          saving={saving}
          removing={removing}
          canManage={canManage}
          error={error}
          onWorkspace={(id) => {
            onWorkspace(id);
            collapse();
          }}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
          onModel={onModel}
        />
      </div>

      <div className="grid grid-cols-3 gap-1 px-3 md:grid-cols-1">
        {modes.map((item) => {
          const Icon = item.icon;
          const selected = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onMode(item.id);
                collapse();
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm md:justify-start ${
                selected ? "bg-tertiary text-primary" : "text-secondary hover:bg-primary hover:text-primary"
              }`}
            >
              <Icon className={`size-4 ${selected ? "text-accent" : ""}`} strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-3 pb-3">
        <p className="px-2 font-tertiary text-[10px] tracking-[0.16em] text-secondary">RECENT</p>
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {chats.length === 0 && (
            <li className="px-2 py-2 text-sm text-secondary">No chats yet.</li>
          )}
          {chats.map((thread) => {
            const selected = mode === "chat" && chatId === thread.id;

            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChat(thread.id);
                    collapse();
                  }}
                  className={`w-full rounded-lg px-2 py-2 text-left ${
                    selected ? "bg-tertiary" : "hover:bg-primary"
                  }`}
                >
                  <span className="block truncate text-sm text-primary">{thread.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 border-t border-primary pt-2">
          {leaveError && <p className="px-2 pb-2 text-xs text-secondary">{leaveError}</p>}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => void leave()}
              disabled={leaving}
              className="rounded-lg px-2 py-2 text-sm text-secondary hover:text-primary disabled:opacity-60"
            >
              {leaving ? "Signing out" : "Log out"}
            </button>
            <ThemeIcon />
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

function WorkspaceSwitch({
  workspaces,
  activeId,
  name,
  model,
  creating,
  saving,
  removing,
  canManage,
  error,
  onWorkspace,
  onCreate,
  onRename,
  onDelete,
  onModel,
}: {
  workspaces: WorkspaceSummary[];
  activeId: string | null;
  name: string;
  model: ChatModel;
  creating: boolean;
  saving: boolean;
  removing: boolean;
  canManage: boolean;
  error: string;
  onWorkspace: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onModel: (model: ChatModel) => Promise<void>;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState<null | "create" | "rename">(null);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const busy = creating || saving || removing;

  const dismiss = useCallback(() => {
    setOpen(false);
    setNaming(null);
    setConfirming(false);
    setDraft("");
    setNotice("");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismiss]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    if (next.length < 3 || next.length > 20) {
      setNotice("Use 3 to 20 characters");
      return;
    }
    try {
      if (naming === "rename") await onRename(next);
      else await onCreate(next);
      dismiss();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not save the workspace");
    }
  }

  async function confirmDelete() {
    try {
      await onDelete();
      dismiss();
    } catch {
      setConfirming(true);
    }
  }

  async function changeModel(next: ChatModel) {
    setNotice("");
    try {
      await onModel(next);
    } catch {
      return;
    }
  }

  return (
    <div ref={rootRef} className="relative mt-5">
      <p className="font-tertiary text-[10px] tracking-[0.16em] text-secondary">WORKSPACE</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={removing}
        onClick={() => setOpen((value) => !value)}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left hover:bg-primary disabled:hover:bg-transparent"
      >
        <span className="truncate font-secondary text-2xl tracking-tight text-primary">
          {name || "Workspace"}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-secondary ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-primary bg-secondary p-1 shadow-menu"
        >
          <ul className="max-h-48 overflow-y-auto">
            {workspaces.map((workspace) => {
              const selected = workspace.id === activeId;
              return (
                <li key={workspace.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onWorkspace(workspace.id);
                      dismiss();
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                      selected ? "bg-tertiary text-primary" : "text-secondary hover:bg-primary hover:text-primary"
                    }`}
                  >
                    <Check className={`size-3.5 shrink-0 ${selected ? "text-accent" : "opacity-0"}`} />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="my-1 border-t border-primary" />
          {naming ? (
            <form onSubmit={(event) => void submit(event)} className="p-1">
              <input
                autoFocus
                value={draft}
                maxLength={20}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setNotice("");
                }}
                placeholder="Workspace name"
                className="w-full rounded-lg border border-primary bg-primary px-2 py-2 text-sm text-primary outline-none focus:border-accent"
              />
              {notice && <p className="mt-1 px-1 text-xs text-secondary">{notice}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-lg bg-accent px-2 py-2 text-sm text-on-accent disabled:opacity-60"
              >
                {busy ? "Saving" : naming === "rename" ? "Save" : "Create"}
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setNaming("create");
                  setDraft("");
                  setNotice("");
                  setConfirming(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-primary hover:bg-primary"
              >
                <Plus className="size-3.5 text-accent" />
                New workspace
              </button>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setNaming("rename");
                      setDraft(name);
                      setNotice("");
                      setConfirming(false);
                    }}
                    className="flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-primary hover:bg-primary"
                  >
                    Rename
                  </button>
                  <label className="block px-2 py-2">
                    <span className="font-tertiary text-[10px] tracking-[0.16em] text-secondary">MODEL</span>
                    <select
                      value={model}
                      disabled={busy}
                      onChange={(event) => void changeModel(event.target.value as ChatModel)}
                      className="mt-1 w-full rounded-lg border border-primary bg-primary px-2 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
                    >
                      {CHAT_MODELS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirming) void confirmDelete();
                      else setConfirming(true);
                    }}
                    disabled={busy}
                    className="flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-primary hover:bg-primary disabled:opacity-60"
                  >
                    {removing ? "Deleting" : confirming ? "Confirm delete" : "Delete workspace"}
                  </button>
                </>
              )}
            </>
          )}
          {notice && !naming && <p className="px-2 py-1 text-xs text-secondary">{notice}</p>}
          {error && !naming && <p className="px-2 py-1 text-xs text-secondary">{error}</p>}
        </div>
      )}
    </div>
  );
}
