"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { isAbort } from "@/services/api";
import { MOSAIC } from "@/services/mosaic";
import type {
  ArtifactType,
  SourceDetail,
  SourceStatus,
  SourceType,
  WorkspaceArtifact,
  WorkspaceSource,
} from "@/services/mosaic";
import { type ChatMessage, type ChatThread } from "./data";

const kindLabel: Record<SourceType, string> = {
  TEXT: "Notes",
  MARKDOWN: "Markdown",
  PDF: "PDF",
  WEBSITE: "Website",
  YOUTUBE: "YouTube",
};

const statusLabel: Record<SourceStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

const artifactLabel: Record<ArtifactType, string> = {
  SUMMARY: "Summary",
  TAKEAWAYS: "Takeaways",
  FLASHCARDS: "Flashcards",
  QUIZ: "Quiz",
  MINDMAP: "Mind map",
  REPORT: "Report",
};

const typeFilters: { value: "" | SourceType; label: string }[] = [
  { value: "", label: "All types" },
  { value: "PDF", label: "PDF" },
  { value: "WEBSITE", label: "Website" },
  { value: "TEXT", label: "Notes" },
  { value: "MARKDOWN", label: "Markdown" },
  { value: "YOUTUBE", label: "YouTube" },
];

const MAX_PDF_BYTES = 50 * 1024 * 1024;

type Busy = "file" | "url" | "note" | "delete" | "refresh";

function failureMessage(cause: unknown, fallback: string) {
  if (isAbort(cause)) return "";
  return cause instanceof Error ? cause.message : fallback;
}

function pdfTitle(file: File) {
  const base = file.name.replace(/\.pdf$/i, "").trim();
  return (base || "PDF").slice(0, 200);
}

function pdfProblem(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) return `${file.name} is not a PDF`;
  if (file.type && file.type !== "application/pdf" && file.type !== "application/octet-stream") {
    return `${file.name} is not a PDF`;
  }
  if (file.size === 0) return `${file.name} is empty`;
  if (file.size > MAX_PDF_BYTES) return `${file.name} is over 50 MB`;
  return "";
}

function websiteLink(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Enter a full link, including https://");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Enter a full link, including https://");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host.endsWith("youtube-nocookie.com")
  ) {
    throw new Error("YouTube import is still in progress. Paste a website link.");
  }
  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  const title = `${parsed.hostname.replace(/^www\./, "")}${path}`.replace(/\/$/, "").slice(0, 200);
  return { url: parsed.toString(), title: title || "Website" };
}

function safeHttp(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function runPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  if (items.length === 0) return;
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) return;
      await task(item);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

export function UploadPanel({
  workspaceId,
  sources,
  onPdf,
  onWebsite,
  onNote,
  onDelete,
  onRefresh,
}: {
  workspaceId: string;
  sources: WorkspaceSource[];
  onPdf: (file: File, title: string) => Promise<void>;
  onWebsite: (url: string, title: string) => Promise<void>;
  onNote: (input: { type: "TEXT" | "MARKDOWN"; title: string; content: string }) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryGen = useRef(0);
  const [url, setUrl] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<"TEXT" | "MARKDOWN">("TEXT");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"" | SourceType>("");
  const [remote, setRemote] = useState<WorkspaceSource[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SourceDetail>>({});
  const [detailError, setDetailError] = useState("");
  const [detailErrorFor, setDetailErrorFor] = useState<string | null>(null);
  const requestKey = `${workspaceId}|${query.trim()}|${kind}`;
  const [seenRequest, setSeenRequest] = useState(requestKey);
  if (seenRequest !== requestKey) {
    setSeenRequest(requestKey);
    setRemote(null);
    setSearching(false);
  }
  if (detailErrorFor !== openId) {
    setDetailErrorFor(openId);
    setDetailError("");
  }
  const detail = openId ? (detailCache[openId] ?? null) : null;
  const [busy, setBusy] = useState<Busy | null>(null);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sources.filter((source) => {
      if (kind && source.type !== kind) return false;
      if (needle && !source.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [sources, query, kind]);

  const visible = remote ?? filtered;
  const locked = busy !== null;

  useEffect(() => {
    const needle = query.trim();
    if (!needle && !kind) return;
    const generation = ++queryGen.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (generation !== queryGen.current) return;
      setSearching(true);
      void MOSAIC.listSources(
        workspaceId,
        { q: needle || undefined, type: kind || undefined },
        controller.signal,
      )
        .then((rows) => {
          if (generation !== queryGen.current) return;
          setRemote(rows);
        })
        .catch((cause: unknown) => {
          if (generation !== queryGen.current || isAbort(cause)) return;
          setNotice(failureMessage(cause, "Could not search sources"));
        })
        .finally(() => {
          if (generation === queryGen.current) setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [workspaceId, query, kind]);

  useEffect(() => {
    if (!openId || detailCache[openId]) return;
    const controller = new AbortController();
    let ignore = false;
    void MOSAIC.getSource(workspaceId, openId, controller.signal)
      .then((next) => {
        if (ignore) return;
        setDetailCache((current) => (current[openId] ? current : { ...current, [openId]: next }));
      })
      .catch((cause: unknown) => {
        if (ignore || isAbort(cause)) return;
        setDetailError(failureMessage(cause, "Could not open this source"));
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [openId, workspaceId, detailCache]);

  function invalidateSearch() {
    queryGen.current += 1;
    setRemote(null);
    setSearching(false);
  }

  async function addFiles(list: FileList | null) {
    if (!list || locked) return;
    const files = [...list];
    const problems = files.map(pdfProblem).filter(Boolean);
    const accepted = files.filter((file) => !pdfProblem(file));
    if (fileRef.current) fileRef.current.value = "";
    if (accepted.length === 0) {
      setNotice(problems[0] || "Choose a PDF");
      return;
    }
    setBusy("file");
    let done = 0;
    const failures = [...problems];
    setProgress(`Uploading 1 of ${accepted.length}`);
    try {
      await runPool(accepted, 2, async (file) => {
        try {
          await onPdf(file, pdfTitle(file));
        } catch (cause) {
          failures.push(failureMessage(cause, `Could not upload ${file.name}`));
        }
        done += 1;
        if (done < accepted.length) setProgress(`Uploading ${done + 1} of ${accepted.length}`);
      });
      invalidateSearch();
      setNotice(failures.filter(Boolean).join(" "));
    } finally {
      setProgress("");
      setBusy(null);
    }
  }

  async function addUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setNotice("");
    let link: { url: string; title: string };
    try {
      link = websiteLink(url);
    } catch (cause) {
      setNotice(failureMessage(cause, "Enter a full link, including https://"));
      return;
    }
    setBusy("url");
    try {
      await onWebsite(link.url, link.title);
      setUrl("");
      invalidateSearch();
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not import that site"));
    } finally {
      setBusy(null);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const title = noteTitle.trim();
    const content = noteBody.trim();
    if (!title || !content) {
      setNotice("Add a title and some text");
      return;
    }
    setBusy("note");
    setNotice("");
    try {
      await onNote({ type: noteType, title: title.slice(0, 200), content });
      setNoteTitle("");
      setNoteBody("");
      invalidateSearch();
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not save the note"));
    } finally {
      setBusy(null);
    }
  }

  async function remove(ids: string[]) {
    if (locked || ids.length === 0) return;
    setBusy("delete");
    setNotice("");
    try {
      await onDelete(ids);
      setSelected((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (openId && ids.includes(openId)) setOpenId(null);
      invalidateSearch();
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not remove the source"));
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    if (locked) return;
    setBusy("refresh");
    setNotice("");
    try {
      await onRefresh();
      invalidateSearch();
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not refresh sources"));
    } finally {
      setBusy(null);
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = visible.filter((source) => selected.has(source.id)).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-8 sm:px-10">
      <p className="font-tertiary text-[11px] tracking-[0.16em] text-secondary">SOURCES</p>
      <h1 className="mt-2 font-secondary text-4xl tracking-tight">Add material</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">
        A PDF, a site, or a note. It stays in this workspace and can be cited later.
      </p>

      <label
        className={`mt-8 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-primary bg-secondary px-6 py-12 text-center hover:border-accent ${
          locked ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <span className="font-secondary text-2xl">{progress || "Drop a PDF"}</span>
        <span className="mt-2 text-sm text-secondary">Up to 50 MB. Other file types stay out for now.</span>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(event) => void addFiles(event.target.files)}
        />
      </label>

      <form onSubmit={(event) => void addUrl(event)} className="mt-4 flex gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a site link"
          disabled={locked}
          className="min-w-0 flex-1 rounded-lg border border-primary bg-secondary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={locked}
          className="rounded-lg bg-accent px-4 text-sm text-on-accent disabled:opacity-60"
        >
          {busy === "url" ? "Importing" : "Add"}
        </button>
      </form>

      <form onSubmit={(event) => void addNote(event)} className="mt-4 rounded-2xl border border-primary bg-secondary p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-tertiary text-[10px] tracking-[0.14em] text-secondary">NOTES</p>
          <div className="grid grid-cols-2 rounded-lg bg-primary p-1">
            {(
              [
                ["TEXT", "Text"],
                ["MARKDOWN", "Markdown"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setNoteType(value)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  noteType === value ? "bg-secondary text-primary" : "text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <input
          value={noteTitle}
          onChange={(event) => setNoteTitle(event.target.value)}
          maxLength={200}
          placeholder="Title"
          disabled={locked}
          className="mt-3 w-full rounded-lg border border-primary bg-primary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
        />
        <textarea
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          rows={5}
          placeholder="Paste the passage you want to keep"
          maxLength={100000}
          disabled={locked}
          className="mt-2 w-full resize-y rounded-lg border border-primary bg-primary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={locked}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm text-on-accent disabled:opacity-60"
        >
          {busy === "note" ? "Saving" : "Save note"}
        </button>
      </form>

      {notice && <p className="mt-4 text-sm text-secondary">{notice}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setNotice("");
          }}
          placeholder="Search titles"
          className="min-w-0 flex-1 rounded-lg border border-primary bg-secondary px-3 py-2 text-sm text-primary outline-none focus:border-accent"
        />
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as "" | SourceType)}
          className="rounded-lg border border-primary bg-secondary px-3 py-2 text-sm text-primary outline-none focus:border-accent"
        >
          {typeFilters.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={locked}
          className="rounded-lg px-3 py-2 text-sm text-secondary hover:text-primary disabled:opacity-60"
        >
          {busy === "refresh" ? "Refreshing" : "Refresh"}
        </button>
      </div>
      {searching && <p className="mt-2 text-sm text-secondary">Searching</p>}
      {selectedCount > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-secondary">{selectedCount} selected</p>
          <button
            type="button"
            onClick={() =>
              void remove(visible.filter((source) => selected.has(source.id)).map((source) => source.id))
            }
            disabled={locked}
            className="rounded-lg bg-accent px-3 py-2 text-sm text-on-accent disabled:opacity-60"
          >
            {busy === "delete" ? "Removing" : "Remove"}
          </button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-primary overflow-hidden rounded-2xl border border-primary bg-secondary">
        {visible.length === 0 && (
          <li className="px-4 py-6 text-sm text-secondary">
            {query.trim() || kind ? "Nothing matches." : "Nothing in this workspace yet."}
          </li>
        )}
        {visible.map((source) => {
          const open = openId === source.id;
          const preview = detail?.source
            ? detail.source.length > 4000
              ? `${detail.source.slice(0, 4000)}…`
              : detail.source
            : "";
          const link = safeHttp(detail?.url ?? null);
          const file = safeHttp(detail?.fileUrl ?? null);
          return (
            <li key={source.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(source.id)}
                  onChange={() => toggleSelected(source.id)}
                  aria-label={`Select ${source.title}`}
                  className="size-4 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : source.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm text-primary" title={source.title}>
                    {source.title}
                  </p>
                  <p className="mt-0.5 font-tertiary text-[10px] tracking-[0.12em] text-secondary">
                    {kindLabel[source.type].toUpperCase()}
                  </p>
                </button>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-tertiary text-[10px] ${
                    source.status === "COMPLETED" ? "bg-tertiary text-accent" : "bg-primary text-secondary"
                  }`}
                >
                  {statusLabel[source.status]}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${source.title}`}
                  onClick={() => void remove([source.id])}
                  disabled={locked}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-secondary hover:bg-primary hover:text-primary disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {open && (
                <div className="border-t border-primary px-4 py-3 text-sm text-secondary">
                  {detailError && <p>{detailError}</p>}
                  {!detailError && detail?.id !== source.id && <p>Opening</p>}
                  {detail?.id === source.id && (
                    <div className="space-y-2">
                      {link && (
                        <a href={link} target="_blank" rel="noreferrer" className="block truncate text-accent">
                          {link}
                        </a>
                      )}
                      {file && (
                        <a href={file} target="_blank" rel="noreferrer" className="block truncate text-accent">
                          Open file
                        </a>
                      )}
                      {preview && (
                        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-primary">{preview}</p>
                      )}
                      {!link && !file && !preview && <p>No preview stored for this source.</p>}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
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
            {thread
              ? "This thread is saved on the workspace. Message history arrives with the chat API."
              : "Questions you type stay in this tab. Replies arrive once chat is connected."}
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

export function LearnPanel({ artifacts }: { artifacts: WorkspaceArtifact[] }) {
  const [active, setActive] = useState<string | null>(artifacts[0]?.id ?? null);
  const piece = artifacts.find((item) => item.id === active) ?? artifacts[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-8 sm:px-10">
      <p className="font-tertiary text-[11px] tracking-[0.16em] text-secondary">LEARN</p>
      <h1 className="mt-2 font-secondary text-4xl tracking-tight">From the same sources</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">
        Summaries, cards, quizzes, and reports for this workspace show up here once they are generated.
      </p>

      {piece === null ? (
        <p className="mt-8 rounded-2xl border border-primary bg-secondary px-4 py-6 text-sm text-secondary">
          Nothing generated for this workspace yet.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            {artifacts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  item.id === piece.id
                    ? "bg-tertiary text-primary"
                    : "bg-secondary text-secondary hover:text-primary"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          <article className="mt-4 rounded-2xl border border-primary bg-secondary p-6">
            <p className="font-tertiary text-[10px] tracking-[0.14em] text-accent">
              {artifactLabel[piece.type].toUpperCase()}
            </p>
            <p className="mt-3 font-secondary text-2xl leading-snug text-primary">{piece.title}</p>
            <p className="mt-3 text-sm text-secondary">{statusLabel[piece.status]}</p>
          </article>
        </>
      )}
    </div>
  );
}
