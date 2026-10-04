"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkspaceSource } from "@/services/mosaic";
import { type ChatMessage, type Mode, type SourceItem, type SourceStatus } from "./data";
import { ChatPanel, LearnPanel, UploadPanel } from "./panels";
import { Sidebar } from "./sidebar";
import { useWorkspaces } from "./use-workspaces";

const kindLabel: Record<WorkspaceSource["type"], string> = {
  TEXT: "Document",
  MARKDOWN: "Document",
  PDF: "PDF",
  DOC: "Document",
  CSV: "Sheet",
  YOUTUBE: "YouTube",
  WEBSITE: "Website",
};

const statusLabel: Record<WorkspaceSource["status"], SourceStatus> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

export function Dashboard({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const desk = useWorkspaces();
  const [mode, setMode] = useState<Mode>("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, SourceItem[]>>({});
  const [notes, setNotes] = useState<Record<string, ChatMessage[]>>({});

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
    router.push(`/mosaic/${id}`);
  }

  async function createWorkspace(name: string) {
    const id = await desk.create(name);
    setChatId(null);
    router.push(`/mosaic/${id}`);
  }

  function addSource(title: string, kind: string) {
    const id = workspaceId;
    setAdded((current) => ({
      ...current,
      [id]: [
        {
          id: `${kind}-${title}-${(current[id] ?? []).length}`,
          title,
          kind,
          status: "Pending",
        },
        ...(current[id] ?? []),
      ],
    }));
  }

  function send(text: string) {
    const id = chatId ?? "draft";
    if (!chatId) setChatId("draft");
    setNotes((current) => ({
      ...current,
      [id]: [...(current[id] ?? []), { role: "you", text }],
    }));
  }

  const serverSources: SourceItem[] = (desk.active?.sources ?? []).map((source) => ({
    id: source.id,
    title: source.title,
    kind: kindLabel[source.type],
    status: statusLabel[source.status],
  }));
  const sources = [...(added[workspaceId] ?? []), ...serverSources];
  const chats = desk.active?.chats ?? [];
  const selected = chats.find((item) => item.id === chatId) ?? null;
  const thread = selected
    ? { id: selected.id, title: selected.title, when: "", messages: [] }
    : null;

  return (
    <div className="flex h-full min-h-0 bg-primary text-primary">
      <Sidebar
        mode={mode}
        chatId={chatId}
        workspaces={desk.workspaces}
        activeId={workspaceId}
        name={desk.name}
        chats={chats}
        creating={desk.creating}
        error={desk.error}
        onMode={chooseMode}
        onChat={openChat}
        onWorkspace={chooseWorkspace}
        onCreate={createWorkspace}
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
            {mode === "upload" && <UploadPanel sources={sources} onAdd={addSource} />}
            {mode === "chat" && (
              <ChatPanel thread={thread} extra={notes[chatId ?? "draft"] ?? []} onSend={send} />
            )}
            {mode === "learn" && <LearnPanel />}
          </>
        )}
      </main>
    </div>
  );
}
