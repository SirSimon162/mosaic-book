"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/session";
import { type ChatMessage, type Mode } from "./data";
import { ChatPanel, LearnPanel, UploadPanel } from "./panels";
import { Sidebar } from "./sidebar";
import { useWorkspaces } from "./use-workspaces";

export function Dashboard({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const session = useSession();
  const desk = useWorkspaces();
  const [mode, setMode] = useState<Mode>("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, ChatMessage[]>>({});

  const ownerId =
    desk.workspaces.find((item) => item.id === workspaceId)?.ownerId ?? desk.active?.ownerId;
  const canManage = Boolean(session.user && ownerId && session.user.id === ownerId);

  function chooseMode(next: Mode) {
    setMode(next);
    if (next === "chat") setChatId(null);
  }

  function openChat(id: string) {
    setMode("chat");
    setChatId(id);
  }

  function chooseWorkspace(id: string) {
    if (id === workspaceId) return;
    setChatId(null);
    setNotes({});
    router.push(`/mosaic/${id}`);
  }

  async function createWorkspace(name: string) {
    const id = await desk.create(name);
    setChatId(null);
    setNotes({});
    router.push(`/mosaic/${id}`);
  }

  async function removeWorkspace() {
    const next = await desk.remove();
    setChatId(null);
    setNotes({});
    router.push(`/mosaic/${next}`);
  }

  function send(text: string) {
    const id = chatId ?? "draft";
    if (!chatId) setChatId("draft");
    setNotes((current) => ({
      ...current,
      [id]: [...(current[id] ?? []), { role: "you", text }],
    }));
  }

  const chats = desk.active?.chats ?? [];
  const selected = chats.find((item) => item.id === chatId) ?? null;
  const thread = selected ? { id: selected.id, title: selected.title, when: "", messages: [] } : null;

  return (
    <div className="flex h-full min-h-0 bg-primary text-primary">
      <Sidebar
        mode={mode}
        chatId={chatId}
        workspaces={desk.workspaces}
        activeId={workspaceId}
        name={desk.name}
        model={desk.active?.defaultModel ?? "gpt-4o-mini"}
        chats={chats}
        creating={desk.creating}
        saving={desk.saving}
        removing={desk.removing}
        canManage={canManage}
        error={desk.error}
        onMode={chooseMode}
        onChat={openChat}
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
                onNote={desk.createNote}
                onDelete={desk.deleteSources}
                onRefresh={desk.refreshSources}
              />
            )}
            {mode === "chat" && (
              <ChatPanel thread={thread} extra={notes[chatId ?? "draft"] ?? []} onSend={send} />
            )}
            {mode === "learn" && <LearnPanel key={workspaceId} artifacts={desk.active?.artifacts ?? []} />}
          </>
        )}
      </main>
    </div>
  );
}
