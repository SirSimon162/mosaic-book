"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/features/auth/session";
import {
  CHAT_MODELS,
  type ChatModel,
  type WorkspaceChat,
  type WorkspaceInvite,
  type WorkspaceSummary,
} from "@/services/mosaic";
import { Brand } from "@/shared/branding/brand";
import type { Mode } from "./data";
import { Icon, type MosaicIconName } from "./icons";
import { MosaicTheme } from "./theme";

const modes: { id: Mode; label: string; icon: MosaicIconName }[] = [
  { id: "upload", label: "Upload", icon: "upload" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "learn", label: "Learn", icon: "bookmark" },
];

const SPRING = { type: "spring" as const, stiffness: 280, damping: 30, mass: 0.85 };

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
  members,
  error,
  onMode,
  onChat,
  onNewChat,
  onWorkspace,
  onCreate,
  onRename,
  onDelete,
  onModel,
  onInvite,
  onJoin,
  menuOpen,
  onMenu,
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
  members: { email: string }[];
  error: string;
  onMode: (mode: Mode) => void;
  onChat: (id: string) => void;
  onNewChat: () => void;
  onWorkspace: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onModel: (model: ChatModel) => Promise<void>;
  onInvite: (email: string) => Promise<WorkspaceInvite>;
  onJoin: (token: string) => Promise<void>;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const [squeezed, setSqueezed] = useState(false);
  const motionTransition = reduce ? { duration: 0.01 } : SPRING;
  const shared = {
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
    members,
    error,
    onMode,
    onChat,
    onNewChat,
    onWorkspace,
    onCreate,
    onRename,
    onDelete,
    onModel,
    onInvite,
    onJoin,
  };

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onMenu(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, onMenu]);

  return (
    <>
      {menuOpen && (
        <button type="button" aria-label="Close sidebar" onClick={() => onMenu(false)} className="m-scrim fixed inset-0 z-30 md:hidden" />
      )}

      <aside
        className={`m-sidebar fixed inset-y-0 left-0 z-40 flex h-full min-h-0 w-[min(272px,100vw)] flex-col overflow-hidden transition-transform duration-200 ease-out md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <SidebarBody
          {...shared}
          compact={false}
          toggleLabel="Close sidebar"
          onToggle={() => onMenu(false)}
          onNavigate={() => onMenu(false)}
        />
      </aside>

      <motion.aside
        initial={false}
        animate={{ width: squeezed ? 76 : 272 }}
        transition={motionTransition}
        className="m-sidebar hidden h-full min-h-0 shrink-0 flex-col overflow-hidden md:flex"
      >
        <SidebarBody
          {...shared}
          compact={squeezed}
          toggleLabel={squeezed ? "Expand sidebar" : "Squeeze sidebar"}
          onToggle={() => setSqueezed((value) => !value)}
          onNavigate={() => undefined}
        />
      </motion.aside>
    </>
  );
}

function SidebarBody({
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
  members,
  error,
  onMode,
  onChat,
  onNewChat,
  onWorkspace,
  onCreate,
  onRename,
  onDelete,
  onModel,
  onInvite,
  onJoin,
  compact,
  toggleLabel,
  onToggle,
  onNavigate,
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
  members: { email: string }[];
  error: string;
  onMode: (mode: Mode) => void;
  onChat: (id: string) => void;
  onNewChat: () => void;
  onWorkspace: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onModel: (model: ChatModel) => Promise<void>;
  onInvite: (email: string) => Promise<WorkspaceInvite>;
  onJoin: (token: string) => Promise<void>;
  compact: boolean;
  toggleLabel: string;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const { leaving, logout } = useSession();
  const [leaveError, setLeaveError] = useState("");

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
      <div className="shrink-0 px-3 pt-4 pb-2">
        <div className={`flex items-center gap-2 ${compact ? "justify-center" : "justify-between"}`}>
          {!compact && (
            <Link href="/" className="inline-flex min-w-0">
              <Brand className="h-6" />
            </Link>
          )}
          <button type="button" aria-label={toggleLabel} onClick={onToggle} className="m-icon-btn">
            <Icon name="sidebar" size={18} />
          </button>
        </div>
        {!compact && (
          <WorkspaceSwitch
            workspaces={workspaces}
            activeId={activeId}
            name={name}
            model={model}
            creating={creating}
            saving={saving}
            removing={removing}
            canManage={canManage}
            members={members}
            error={error}
            onInvite={onInvite}
            onJoin={onJoin}
            onWorkspace={(id) => {
              onWorkspace(id);
              onNavigate();
            }}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
            onModel={onModel}
          />
        )}
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-1 gap-1 px-2">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            data-selected={mode === item.id}
            onClick={() => {
              onMode(item.id);
              onNavigate();
            }}
            className={
              compact
                ? "m-icon-btn m-item mx-auto"
                : "m-item grid h-10 grid-cols-[20px_minmax(0,1fr)] items-center gap-2.5 px-2.5 text-left text-sm"
            }
          >
            <Icon name={item.icon} />
            {!compact && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 flex min-h-0 flex-1 basis-0 flex-col overflow-hidden px-2">
          <div className="mb-2 flex shrink-0 items-center justify-between px-2">
            <p className="m-kicker">RECENT</p>
            <button
              type="button"
              onClick={() => {
                onNewChat();
                onNavigate();
              }}
              className="m-btn-ghost"
            >
              <Icon name="plus" size={14} />
              New
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain">
            {chats.length === 0 && <li className="m-muted px-2 py-2 text-sm">No chats yet.</li>}
            {chats.map((thread) => {
              const selected = mode === "chat" && chatId === thread.id;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    data-selected={selected}
                    onClick={() => {
                      onChat(thread.id);
                      onNavigate();
                    }}
                    className="m-item w-full px-2.5 py-2 text-left"
                  >
                    <span className="block truncate text-sm">{thread.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {leaveError && !compact && <p className="m-muted shrink-0 px-4 pt-2 text-xs">{leaveError}</p>}
      <div className={`m-dock mt-auto px-2 ${compact ? "flex-col justify-center gap-0" : "justify-between"}`}>
        <button type="button" onClick={() => void leave()} disabled={leaving} aria-label="Log out" className={compact ? "m-icon-btn" : "m-btn-ghost"}>
          <Icon name="logout" size={16} />
          {!compact && (leaving ? "Signing out" : "Log out")}
        </button>
        <MosaicTheme />
      </div>
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
  members,
  error,
  compact = false,
  onInvite,
  onJoin,
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
  members: { email: string }[];
  error: string;
  compact?: boolean;
  onInvite: (email: string) => Promise<WorkspaceInvite>;
  onJoin: (token: string) => Promise<void>;
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
  const [sharing, setSharing] = useState<null | "invite" | "join">(null);
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const busy = creating || saving || removing;

  const dismiss = useCallback(() => {
    setOpen(false);
    setNaming(null);
    setSharing(null);
    setInvite(null);
    setInviteLink("");
    setCopied(false);
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

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = draft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice("Enter a valid email");
      return;
    }
    try {
      const created = await onInvite(email);
      setInvite(created);
      setInviteLink(`${window.location.origin}/mosaic?invite=${encodeURIComponent(created.token)}`);
      setCopied(false);
      setNotice("");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not create the invite");
    }
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = draft.trim();
    if (!token || token.length > 200) {
      setNotice("Paste the invite token");
      return;
    }
    try {
      await onJoin(token);
      dismiss();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not join this workspace");
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setNotice("");
    } catch {
      setCopied(false);
      setNotice("Select the link and copy it");
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
    <div ref={rootRef} className={`relative ${compact ? "mt-3" : "mt-4"}`}>
      {!compact && <p className="m-kicker px-1">WORKSPACE</p>}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={name || "Workspace"}
        disabled={removing}
        onClick={() => setOpen((value) => !value)}
        className={
          compact
            ? "m-icon-btn mx-auto mt-1"
            : "m-item mt-1 flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
        }
      >
        {!compact && <span className="truncate text-lg tracking-tight">{name || "Workspace"}</span>}
        <Icon name="chevron" size={compact ? 18 : 22} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div
          id={menuId}
          className={`m-menu absolute z-30 max-h-[min(24rem,70vh)] overflow-y-auto p-1.5 ${
            compact ? "top-0 left-full ml-2 w-72" : "top-full right-0 left-0 mt-1"
          }`}
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
                    data-selected={selected}
                    className="m-item flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                  >
                    <Icon name="check" size={14} className={selected ? "" : "opacity-0"} />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="m-split my-1" />
          {members.length > 0 && (
            <p className="m-muted line-clamp-2 px-2 py-1 text-xs">
              {members.map((member) => member.email).join(", ")}
            </p>
          )}
          {sharing === "invite" ? (
            <form onSubmit={(event) => void sendInvite(event)} className="p-1">
              {invite ? (
                <>
                  <p className="m-muted px-1 text-xs leading-relaxed">
                    For {invite.email}. Expires {new Date(invite.expiresAt).toLocaleString()}.
                  </p>
                  <input readOnly value={inviteLink} className="m-field mt-2" onFocus={(event) => event.currentTarget.select()} />
                  <button type="button" onClick={() => void copyLink()} className="m-btn mt-2 w-full">
                    {copied ? "Copied" : "Copy invite link"}
                  </button>
                </>
              ) : (
                <input
                  autoFocus
                  type="email"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setNotice("");
                  }}
                  placeholder="Email address"
                  className="m-field"
                />
              )}
              {notice && <p className="mt-1 px-1 m-muted text-xs break-all">{notice}</p>}
              {!invite && (
                <button
                  type="submit"
                  disabled={busy}
                  className="m-btn mt-2 w-full"
                >
                  Create invite
                </button>
              )}
            </form>
          ) : sharing === "join" ? (
            <form onSubmit={(event) => void join(event)} className="p-1">
              <input
                autoFocus
                value={draft}
                maxLength={200}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setNotice("");
                }}
                placeholder="Invite token"
                className="m-field"
              />
              {notice && <p className="mt-1 px-1 m-muted text-xs">{notice}</p>}
              <button
                type="submit"
                disabled={busy}
                className="m-btn mt-2 w-full"
              >
                Join
              </button>
            </form>
          ) : naming ? (
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
                className="m-field"
              />
              {notice && <p className="mt-1 px-1 m-muted text-xs">{notice}</p>}
              <button
                type="submit"
                disabled={busy}
                className="m-btn mt-2 w-full"
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
                className="m-item flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
              >
                <Icon name="plus" size={14} />
                New workspace
              </button>
              <button
                type="button"
                onClick={() => {
                  setSharing("join");
                  setNaming(null);
                  setInvite(null);
                  setInviteLink("");
                  setCopied(false);
                  setDraft("");
                  setNotice("");
                  setConfirming(false);
                }}
                className="m-item flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
              >
                <Icon name="userPlus" size={14} />
                Join with a token
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
                    className="m-item flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                  >
                    <Icon name="pencil" size={14} />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSharing("invite");
                      setNaming(null);
                      setInvite(null);
                      setInviteLink("");
                      setCopied(false);
                      setDraft("");
                      setNotice("");
                      setConfirming(false);
                    }}
                    className="m-item flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                  >
                    <Icon name="envelope" size={14} />
                    Invite
                  </button>
                  <label className="block px-2 py-2">
                    <span className="m-kicker">MODEL</span>
                    <select
                      value={model}
                      disabled={busy}
                      onChange={(event) => void changeModel(event.target.value as ChatModel)}
                      className="m-field mt-1"
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
                    className="m-item flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                  >
                    <Icon name="trash" size={14} />
                    {removing ? "Deleting" : confirming ? "Confirm delete" : "Delete workspace"}
                  </button>
                </>
              )}
            </>
          )}
          {notice && !naming && !sharing && <p className="m-muted px-2 py-1 text-xs break-all">{notice}</p>}
          {error && !naming && <p className="m-muted px-2 py-1 text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
}
