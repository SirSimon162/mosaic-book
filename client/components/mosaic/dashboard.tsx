"use client";

import { useState } from "react";
import {
  starterSources,
  threads,
  type ChatMessage,
  type Mode,
  type SourceItem,
} from "./data";
import { ChatPanel, LearnPanel, UploadPanel } from "./panels";
import { Sidebar } from "./sidebar";

export function Dashboard() {
  const [mode, setMode] = useState<Mode>("chat");
  const [chatId, setChatId] = useState<string | null>(threads[0].id);
  const [sources, setSources] = useState<SourceItem[]>(starterSources);
  const [notes, setNotes] = useState<Record<string, ChatMessage[]>>({});

  function chooseMode(next: Mode) {
    setMode(next);
    if (next === "chat") setChatId(null);
  }

  function openChat(id: string) {
    setMode("chat");
    setChatId(id);
  }

  function addSource(title: string, kind: string) {
    setSources((current) => [
      { id: `${kind}-${title}-${current.length}`, title, kind, status: "Pending" },
      ...current,
    ]);
  }

  function send(text: string) {
    const id = chatId ?? "draft";
    if (!chatId) setChatId("draft");
    setNotes((current) => ({
      ...current,
      [id]: [...(current[id] ?? []), { role: "you", text }],
    }));
  }

  const thread = threads.find((item) => item.id === chatId) ?? null;
  const extra = notes[chatId ?? "draft"] ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-primary text-primary md:flex-row">
      <Sidebar mode={mode} chatId={chatId} onMode={chooseMode} onChat={openChat} />
      <main
        className={`min-h-0 flex-1 ${mode === "chat" ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        {mode === "upload" && <UploadPanel sources={sources} onAdd={addSource} />}
        {mode === "chat" && <ChatPanel thread={thread} extra={extra} onSend={send} />}
        {mode === "learn" && <LearnPanel />}
      </main>
    </div>
  );
}
