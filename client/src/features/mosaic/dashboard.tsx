"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/session";
import { type Mode } from "./data";
import { InviteLink } from "./invite-link";
import { LearnPanel } from "./learn-panel";
import { ChatPanel, UploadPanel } from "./panels";
import { Icon } from "./icons";
import { Sidebar } from "./sidebar";
import { useWorkspaceChat } from "./use-chat";
import { useWorkspaces } from "./use-workspaces";

export function Dashboard({
  workspaceId,
  inviteToken = "",
}: {
  workspaceId: string;
  inviteToken?: string;
}) {
  const router = useRouter();
  const session = useSession();
  const desk = useWorkspaces();
  const [mode, setMode] = useState<Mode>("chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const chat = useWorkspaceChat(workspaceId, mode === "chat");

  const ownerId =
    desk.workspaces.find((item) => item.id === workspaceId)?.ownerId ?? desk.active?.ownerId;
  const canManage = Boolean(session.user && ownerId && session.user.id === ownerId);
  const thread = desk.active?.chats.find((item) => item.id === chat.chatId) ?? null;

  function openChat(id: string) {
    setMode("chat");
    chat.open(id);
  }

  function startChat() {
    setMode("chat");
    chat.startNew();
  }

  function chooseWorkspace(id: string) {
    if (id === workspaceId) return;
    router.push(`/mosaic/${id}`);
  }

  async function createWorkspace(name: string) {
    const id = await desk.create(name);
    router.push(`/mosaic/${id}`);
  }

  async function removeWorkspace() {
    const next = await desk.remove();
    router.push(`/mosaic/${next}`);
  }

  async function joinWorkspace(token: string) {
    const id = await desk.acceptInvite(token);
    router.push(`/mosaic/${id}`);
  }

  if (inviteToken.trim()) {
    return (
      <div className="grid h-full place-items-center px-6">
        <InviteLink token={inviteToken} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <Sidebar
        mode={mode}
        chatId={chat.chatId}
        workspaces={desk.workspaces}
        activeId={workspaceId}
        name={desk.name}
        model={desk.active?.defaultModel ?? "gpt-4o-mini"}
        chats={desk.active?.chats ?? []}
        creating={desk.creating}
        saving={desk.saving}
        removing={desk.removing}
        canManage={canManage}
        members={desk.active?.users ?? []}
        error={desk.error}
        onMode={setMode}
        onChat={openChat}
        onNewChat={startChat}
        onWorkspace={chooseWorkspace}
        onCreate={createWorkspace}
        onRename={desk.rename}
        onDelete={removeWorkspace}
        onModel={desk.setModel}
        onInvite={desk.createInvite}
        onJoin={joinWorkspace}
        menuOpen={menuOpen}
        onMenu={setMenuOpen}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          className="flex h-12 shrink-0 items-center gap-2 px-3 md:hidden"
          style={{ borderBottom: "1px solid var(--m-line)" }}
        >
          <button type="button" aria-label="Open sidebar" onClick={() => setMenuOpen(true)} className="m-icon-btn">
            <Icon name="sidebar" size={18} />
          </button>
          <p className="min-w-0 truncate text-sm">{desk.name || "Workspace"}</p>
        </div>
        <div className={`min-h-0 flex-1 ${mode === "chat" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {!desk.ready || desk.opening ? (
          <div className="m-page space-y-3">
            <div className="m-skeleton w-28" />
            <div className="m-skeleton w-1/2" />
            <p className="m-muted text-sm">Opening workspace</p>
          </div>
        ) : desk.error && !desk.active ? (
          <div className="m-page">
            <p className="m-muted text-sm">{desk.error}</p>
            <button type="button" onClick={() => void desk.reopen()} className="m-btn mt-4">
              Try again
            </button>
          </div>
        ) : (
          <>
            {mode === "upload" && (
              <UploadPanel
                key={workspaceId}
                workspaceId={workspaceId}
                sources={desk.active?.sources ?? []}
                onPdf={desk.importPdf}
                onWebsite={desk.importWebsite}
                onYouTube={desk.importYouTube}
                onNote={desk.createNote}
                onDelete={desk.deleteSources}
                onReprocess={desk.reprocessSources}
                onRefresh={desk.refreshSources}
                onChatWithSources={(ids) => {
                  chat.startWithSources(ids);
                  setMode("chat");
                }}
              />
            )}
            {mode === "chat" && (
              <ChatPanel
                title={thread?.title ?? "New chat"}
                messages={chat.messages}
                draftText={chat.draftText}
                liveCitations={chat.liveCitations}
                pending={chat.pending}
                loading={chat.loading}
                error={chat.error}
                scopedSources={(chat.sourceIds ?? [])
                  .map((id) => desk.active?.sources.find((source) => source.id === id))
                  .filter((source): source is NonNullable<typeof source> => Boolean(source))
                  .map((source) => ({ id: source.id, title: source.title }))}
                onSend={(text) => void chat.send(text)}
                onClearScope={chat.clearSourceIds}
                onRemoveScope={chat.removeSourceId}
                onDelete={
                  chat.chatId
                    ? () => {
                        const id = chat.chatId;
                        if (id) void chat.remove(id);
                      }
                    : undefined
                }
              />
            )}
            {mode === "learn" && (
              <LearnPanel
                workspaceId={workspaceId}
                sources={desk.active?.sources ?? []}
                artifacts={desk.active?.artifacts ?? []}
                details={desk.artifactDetails}
                onCreate={desk.createArtifact}
                onLoad={desk.loadArtifact}
              />
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
}
