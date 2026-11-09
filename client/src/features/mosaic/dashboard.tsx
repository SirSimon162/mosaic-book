"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/session";
import { type Mode } from "./data";
import { ChatPanel, LearnPanel, UploadPanel } from "./panels";
import { Sidebar } from "./sidebar";
import { useWorkspaceChat } from "./use-chat";
import { useWorkspaces } from "./use-workspaces";

export function Dashboard({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const session = useSession();
  const desk = useWorkspaces();
  const [mode, setMode] = useState<Mode>("chat");
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

  return (
    <div className="flex h-full min-h-0 bg-primary text-primary">
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
        error={desk.error}
        onMode={setMode}
        onChat={openChat}
        onNewChat={startChat}
        onWorkspace={chooseWorkspace}
        onCreate={createWorkspace}
        onRename={desk.rename}
        onDelete={removeWorkspace}
        onModel={desk.setModel}
      />
      <main className={`min-h-0 flex-1 ${mode === "chat" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {!desk.ready || desk.opening ? (
          <p className="px-6 py-10 text-sm text-secondary sm:px-10">Opening workspace</p>
        ) : desk.error && !desk.active ? (
          <div className="px-6 py-10 sm:px-10">
            <p className="text-sm text-secondary">{desk.error}</p>
            <button
              type="button"
              onClick={() => void desk.reopen()}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm text-on-accent"
            >
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
                onSend={(text) => void chat.send(text)}
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
            {mode === "learn" && <LearnPanel key={workspaceId} artifacts={desk.active?.artifacts ?? []} />}
          </>
        )}
      </main>
    </div>
  );
}
