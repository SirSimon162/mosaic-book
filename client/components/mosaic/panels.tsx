"use client";

import { FormEvent, useState } from "react";
import {
  learnPieces,
  type ChatMessage,
  type ChatThread,
  type SourceItem,
} from "./data";

export function UploadPanel({
  sources,
  onAdd,
}: {
  sources: SourceItem[];
  onAdd: (title: string, kind: string) => void;
}) {
  const [url, setUrl] = useState("");

  function addFiles(list: FileList | null) {
    if (!list) return;
    [...list].forEach((file) => onAdd(file.name, "File"));
  }

  function addUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = url.trim();
    if (!value) return;
    const kind = value.includes("youtu") ? "YouTube" : "Website";
    onAdd(value, kind);
    setUrl("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-8 sm:px-10">
      <p className="font-tertiary text-[11px] tracking-[0.16em] text-secondary">SOURCES</p>
      <h1 className="mt-2 font-secondary text-4xl tracking-tight">Add material</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">
        A file, a sheet, a site, or a video. It stays in this workspace and can
        be cited later.
      </p>

      <label className="mt-8 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-primary bg-secondary px-6 py-12 text-center hover:border-accent">
        <span className="font-secondary text-2xl">Drop a file</span>
        <span className="mt-2 text-sm text-secondary">PDF, document, sheet, or notes</span>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
      </label>

      <form onSubmit={addUrl} className="mt-4 flex gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a site or a YouTube link"
          className="min-w-0 flex-1 rounded-lg border border-primary bg-secondary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-lg bg-accent px-4 text-sm text-on-accent">
          Add
        </button>
      </form>

      <ul className="mt-8 divide-y divide-primary overflow-hidden rounded-2xl border border-primary bg-secondary">
        {sources.map((source) => (
          <li key={source.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-primary">{source.title}</p>
              <p className="mt-0.5 font-tertiary text-[10px] tracking-[0.12em] text-secondary">
                {source.kind.toUpperCase()}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 font-tertiary text-[10px] ${
                source.status === "Ready" ? "bg-tertiary text-accent" : "bg-primary text-secondary"
              }`}
            >
              {source.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatPanel({
  thread,
  extra,
  onSend,
}: {
  thread: ChatThread | null;
  extra: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const messages = [...(thread?.messages ?? []), ...extra];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-primary px-6 py-5 sm:px-10">
        <p className="font-tertiary text-[11px] tracking-[0.16em] text-secondary">CHAT</p>
        <h1 className="mt-2 font-secondary text-3xl tracking-tight">
          {thread?.title ?? "New chat"}
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-10">
        {messages.length === 0 ? (
          <p className="max-w-md text-sm leading-relaxed text-secondary">
            Ask this workspace. A later answer can point at a cell, a timestamp,
            a line, or a page.
          </p>
        ) : (
          <ul className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((message, index) => (
              <li key={`${message.role}-${index}`} className="text-sm leading-relaxed">
                <p className="font-tertiary text-[10px] tracking-[0.14em] text-secondary">
                  {message.role === "you" ? "YOU" : "MOSAIC"}
                </p>
                <p className="mt-1 text-primary">{message.text}</p>
                {message.cite && (
                  <p className="mt-2 inline-block rounded-full bg-tertiary px-2 py-0.5 font-tertiary text-[10px] text-accent">
                    {message.cite}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-primary px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about a source"
            className="min-w-0 flex-1 rounded-lg border border-primary bg-secondary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-lg bg-accent px-4 text-sm text-on-accent">
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}

export function LearnPanel() {
  const [active, setActive] = useState(learnPieces[0].id);
  const piece = learnPieces.find((item) => item.id === active) ?? learnPieces[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-8 sm:px-10">
      <p className="font-tertiary text-[11px] tracking-[0.16em] text-secondary">LEARN</p>
      <h1 className="mt-2 font-secondary text-4xl tracking-tight">From the same sources</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">
        Summaries, cards, and notes stay with the workspace they were drawn from.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {learnPieces.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`rounded-lg px-3 py-2 text-sm ${
              item.id === piece.id ? "bg-tertiary text-primary" : "bg-secondary text-secondary hover:text-primary"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      <article className="mt-4 rounded-2xl border border-primary bg-secondary p-6">
        <p className="font-tertiary text-[10px] tracking-[0.14em] text-accent">
          {piece.title.toUpperCase()}
        </p>
        <p className="mt-3 font-secondary text-2xl leading-snug text-primary">{piece.body}</p>
      </article>
    </div>
  );
}
