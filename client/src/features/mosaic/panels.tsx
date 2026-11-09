"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ConfirmDialog } from "./confirm";
import { Icon } from "./icons";
import { isAbort } from "@/services/api";
import { MOSAIC } from "@/services/mosaic";
import type {
  ChatMessageRecord,
  Citation,
  SourceDetail,
  SourceStatus,
  SourceType,
  WorkspaceSource,
} from "@/services/mosaic";

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

const typeFilters: { value: "" | SourceType; label: string }[] = [
  { value: "", label: "All types" },
  { value: "PDF", label: "PDF" },
  { value: "WEBSITE", label: "Website" },
  { value: "TEXT", label: "Notes" },
  { value: "MARKDOWN", label: "Markdown" },
  { value: "YOUTUBE", label: "YouTube" },
];

const MAX_PDF_BYTES = 50 * 1024 * 1024;

type Busy = "file" | "url" | "note" | "delete" | "refresh" | "reprocess" | "passage";

const YOUTUBE_ID =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i;

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

function materialLink(value: string) {
  const trimmed = value.trim();
  if (/^[\w-]{11}$/.test(trimmed)) {
    return {
      kind: "youtube" as const,
      url: `https://www.youtube.com/watch?v=${trimmed}`,
      title: `YouTube ${trimmed}`,
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a full link, including https://");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Enter a full link, including https://");
  }
  const host = parsed.hostname.toLowerCase();
  const youtube =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host.endsWith("youtube-nocookie.com");
  if (youtube) {
    const videoId = trimmed.match(YOUTUBE_ID)?.[1];
    if (!videoId) throw new Error("That YouTube link needs a video id.");
    return { kind: "youtube" as const, url: parsed.toString(), title: `YouTube ${videoId}` };
  }
  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  const title = `${parsed.hostname.replace(/^www\./, "")}${path}`.replace(/\/$/, "").slice(0, 200);
  return { kind: "website" as const, url: parsed.toString(), title: title || "Website" };
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
  onYouTube,
  onNote,
  onDelete,
  onReprocess,
  onRefresh,
}: {
  workspaceId: string;
  sources: WorkspaceSource[];
  onPdf: (file: File, title: string) => Promise<void>;
  onWebsite: (url: string, title: string) => Promise<void>;
  onYouTube: (url: string, title: string) => Promise<void>;
  onNote: (input: { type: "TEXT" | "MARKDOWN"; title: string; content: string }) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  onReprocess: (ids: string[]) => Promise<void>;
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
  const [composer, setComposer] = useState<null | "pdf" | "link" | "note">(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [passage, setPassage] = useState("");
  const [hits, setHits] = useState<Citation[]>([]);
  const [searched, setSearched] = useState(false);
  const passageAbort = useRef<AbortController | null>(null);

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
          setRemote(Array.isArray(rows) ? rows : []);
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
      const failed = failures.filter(Boolean);
      setNotice(failed.join(" "));
      if (failed.length === 0) setComposer(null);
    } finally {
      setProgress("");
      setBusy(null);
    }
  }

  async function addUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setNotice("");
    let link: ReturnType<typeof materialLink>;
    try {
      link = materialLink(url);
    } catch (cause) {
      setNotice(failureMessage(cause, "Enter a full link, including https://"));
      return;
    }
    setBusy("url");
    try {
      if (link.kind === "youtube") await onYouTube(link.url, link.title);
      else await onWebsite(link.url, link.title);
      setUrl("");
      invalidateSearch();
      setComposer(null);
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not import that link"));
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
      setComposer(null);
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

  async function reprocess(ids: string[]) {
    if (locked || ids.length === 0) return;
    setBusy("reprocess");
    setNotice("");
    try {
      await onReprocess(ids);
      setSelected((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not process those sources again"));
    } finally {
      setBusy(null);
    }
  }

  async function findPassage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const queryText = passage.trim().slice(0, 8000);
    if (!queryText || locked) return;
    passageAbort.current?.abort();
    const controller = new AbortController();
    passageAbort.current = controller;
    setBusy("passage");
    setNotice("");
    try {
      const next = await MOSAIC.searchSources(workspaceId, { query: queryText }, controller.signal);
      if (!controller.signal.aborted) {
        setHits(next);
        setSearched(true);
      }
    } catch (cause) {
      if (!isAbort(cause)) setNotice(failureMessage(cause, "Could not search these sources"));
    } finally {
      if (passageAbort.current === controller) {
        passageAbort.current = null;
        setBusy(null);
      }
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

  function toggleAllVisible() {
    const ids = visible.map((source) => source.id);
    setSelected((current) => {
      const next = new Set(current);
      const allOn = ids.length > 0 && ids.every((id) => next.has(id));
      ids.forEach((id) => {
        if (allOn) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }

  const selectedCount = visible.filter((source) => selected.has(source.id)).length;
  const allVisibleSelected = visible.length > 0 && selectedCount === visible.length;

  return (
    <div className="m-page flex flex-col">
      <p className="m-kicker">SOURCES</p>
      <h1 className="m-title mt-2">Add material</h1>
      <p className="m-muted mt-3 max-w-xl text-sm leading-relaxed">
        Pick a kind of material, then add it. Everything already here is listed below.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ["pdf", "PDF", "A file, up to 50 MB", "upload"],
            ["link", "Link", "A site or a YouTube video", "link"],
            ["note", "Note", "Text or markdown you write", "pencil"],
          ] as const
        ).map(([id, label, hint, icon]) => (
          <button key={id} type="button" disabled={locked} onClick={() => setComposer(id)} className="m-tile">
            <Icon name={icon} size={18} />
            <span>
              <span className="block text-sm">{label}</span>
              <span className="m-muted mt-1 block text-xs leading-relaxed">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {composer && (
        <div className="m-modal-scrim" onMouseDown={() => { if (!locked) setComposer(null); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={composer === "pdf" ? "Add a PDF" : composer === "link" ? "Add a link" : "Add a note"}
            className="m-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg tracking-tight">
                {composer === "pdf" ? "Add a PDF" : composer === "link" ? "Add a link" : "Add a note"}
              </p>
              <div className="flex items-center gap-2">
                {composer === "note" && (
                  <div className="m-segment">
                    {(
                      [
                        ["TEXT", "Text"],
                        ["MARKDOWN", "Markdown"],
                      ] as const
                    ).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setNoteType(value)} data-selected={noteType === value}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Close"
                  disabled={locked}
                  onClick={() => setComposer(null)}
                  className="m-icon-btn"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
            {composer === "pdf" && (
              <label className={`m-drop flex cursor-pointer flex-col items-center px-6 py-10 text-center ${locked ? "pointer-events-none opacity-60" : ""}`}>
                <Icon name="upload" size={22} />
                <span className="mt-3 text-lg tracking-tight">{progress || "Drop a PDF"}</span>
                <span className="m-muted mt-2 text-sm">Up to 50 MB. Other file types stay out for now.</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="sr-only"
                  onChange={(event) => void addFiles(event.target.files)}
                />
              </label>
            )}
            {composer === "link" && (
              <form onSubmit={(event) => void addUrl(event)}>
                <input
                  autoFocus
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Paste a site or a YouTube link"
                  disabled={locked}
                  className="m-field"
                />
                <button type="submit" disabled={locked} className="m-btn mt-3 w-full">
                  {busy === "url" ? "Importing" : "Add"}
                </button>
              </form>
            )}
            {composer === "note" && (
              <form onSubmit={(event) => void addNote(event)}>
                <input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  maxLength={200}
                  placeholder="Title"
                  disabled={locked}
                  className="m-field"
                />
                <textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  rows={5}
                  placeholder="Paste the passage you want to keep"
                  maxLength={100000}
                  disabled={locked}
                  className="m-field mt-2"
                />
                <button type="submit" disabled={locked} className="m-btn mt-3 w-full">
                  {busy === "note" ? "Saving" : "Save note"}
                </button>
              </form>
            )}
            {notice && composer && <p className="m-muted mt-3 text-sm">{notice}</p>}
          </div>
        </div>
      )}

      <div className="m-rule mt-10 grid min-w-0 grid-cols-1 gap-0 pt-8 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto_minmax(0,1fr)] lg:gap-0">
      <section className="m-rule-stack flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-span-5 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:gap-x-0 lg:gap-y-3 lg:pr-8">
        <p className="m-kicker">SEARCH</p>
        <h2 className="text-lg tracking-tight">Search</h2>
        <p className="m-muted text-sm leading-relaxed">
          Find a passage in sources that have finished processing.
        </p>
        <form onSubmit={(event) => void findPassage(event)} className="flex min-w-0 items-center gap-2 self-start">
          <input
            value={passage}
            onChange={(event) => setPassage(event.target.value)}
            maxLength={8000}
            placeholder="Search inside sources"
            disabled={locked}
            className="m-field min-w-0 flex-1"
          />
          <button type="submit" disabled={locked} className="m-btn shrink-0">
            <Icon name="search" size={14} />
            {busy === "passage" ? "Finding" : "Find"}
          </button>
        </form>
        <div className="min-w-0">
        {busy === "passage" && <p className="m-muted text-sm">Searching</p>}
        {searched && hits.length === 0 && busy !== "passage" && (
          <p className="m-muted text-sm">Nothing matched.</p>
        )}
        {hits.length > 0 && (
          <ul className="grid min-w-0 gap-3">
            {hits.map((hit) => (
              <li key={hit.chunkId} className="m-card m-hit px-4 py-4">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="min-w-0 text-sm leading-relaxed break-words">{hit.sourceTitle}</p>
                  {hit.page ? <span className="m-chip shrink-0">p.{hit.page}</span> : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed">{hit.snippet}</p>
              </li>
            ))}
          </ul>
        )}
        </div>
      </section>

      <section className="order-first m-rule-side flex min-w-0 flex-col gap-3 lg:order-none lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:gap-x-0 lg:gap-y-3">
        <p className="m-kicker">IN THIS WORKSPACE</p>
        <h2 className="text-lg tracking-tight">Sources{sources.length > 0 ? ` · ${sources.length}` : ""}</h2>
        <p className="m-muted text-sm leading-relaxed">Filter the material already in this workspace.</p>

      <div className="flex min-w-0 items-center gap-2 self-start">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setNotice("");
            }}
            placeholder="Filter by title"
            className="m-field m-field-grow"
          />
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as "" | SourceType)}
            aria-label="Source type"
            className="m-field m-field-type"
          >
            {typeFilters.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-pressed={allVisibleSelected}
            onClick={toggleAllVisible}
            disabled={locked || visible.length === 0}
            data-selected={allVisibleSelected}
            className="m-btn-quiet"
          >
            <Icon name="selectAll" size={14} />
            {allVisibleSelected ? "Clear" : "Select all"}
          </button>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {selectedCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void reprocess(visible.filter((source) => selected.has(source.id)).map((source) => source.id))
                  }
                  disabled={locked}
                  className="m-btn-quiet"
                >
                  <Icon name="refresh" size={14} />
                  {busy === "reprocess" ? "Processing" : "Process again"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPendingDelete(visible.filter((source) => selected.has(source.id)).map((source) => source.id))
                  }
                  disabled={locked}
                  className="m-btn"
                >
                  <Icon name="trash" size={14} />
                  {busy === "delete" ? "Removing" : "Remove"}
                </button>
              </>
            )}
            <button type="button" onClick={() => void refresh()} disabled={locked} className="m-btn-quiet">
              <Icon name="refresh" size={14} />
              {busy === "refresh" ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>
      {notice && !composer && <p className="m-muted mt-3 text-sm">{notice}</p>}
      {searching && <p className="m-muted mt-3 text-sm">Searching titles</p>}

      <ul className="m-list mt-3">
        {visible.length === 0 && (
          <li className="m-muted px-4 py-8 text-sm">
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
              <div className="m-source">
                <input
                  type="checkbox"
                  checked={selected.has(source.id)}
                  onChange={() => toggleSelected(source.id)}
                  aria-label={`Select ${source.title}`}
                  className="size-4"
                />
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : source.id)}
                  className="min-w-0 text-left"
                >
                  <p className="text-sm break-words" title={source.title}>
                    {source.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="m-kicker">{kindLabel[source.type].toUpperCase()}</span>
                    <span className="m-chip" data-status={source.status}>
                      {statusLabel[source.status]}
                    </span>
                  </p>
                  {source.error && <p className="m-muted mt-1 line-clamp-2 text-xs">{source.error}</p>}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${source.title}`}
                  onClick={() => setPendingDelete([source.id])}
                  disabled={locked}
                  className="m-icon-btn"
                >
                  <Icon name="trash" />
                </button>
              </div>
              {open && (
                <div className="m-split m-muted px-4 py-3 text-sm">
                  {detailError && <p>{detailError}</p>}
                  {!detailError && detail?.id !== source.id && (
                    <div className="space-y-2">
                      <div className="m-skeleton w-2/3" />
                      <div className="m-skeleton w-full" />
                    </div>
                  )}
                  {detail?.id === source.id && (
                    <div className="space-y-2">
                      {link && (
                        <a href={link} target="_blank" rel="noreferrer" className="m-link block break-all">
                          {link}
                        </a>
                      )}
                      {file && (
                        <a href={file} target="_blank" rel="noreferrer" className="m-link block truncate">
                          Open file
                        </a>
                      )}
                      {preview && (
                        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[var(--m-ink)]">{preview}</p>
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
      </section>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete && pendingDelete.length > 1 ? "Remove these sources?" : "Remove this source?"}
        body="This takes the source out of the workspace. Chats that cited it keep their old replies."
        confirmLabel="Remove"
        pending={busy === "delete"}
        onConfirm={() => {
          if (!pendingDelete) return;
          void remove(pendingDelete).finally(() => setPendingDelete(null));
        }}
        onClose={() => {
          if (busy !== "delete") setPendingDelete(null);
        }}
      />
    </div>
  );
}

function citeLabel(hit: Citation) {
  return hit.page ? `${hit.sourceTitle} · p.${hit.page}` : hit.sourceTitle;
}

function CiteRow({ hits }: { hits: Citation[] }) {
  const [open, setOpen] = useState(false);
  const extra = Math.max(0, hits.length - 4);
  const shown = open ? hits : hits.slice(0, 4);
  const share = !open && shown.length > 1;
  return (
    <div className={`mt-2 flex min-w-0 items-center gap-1 ${open ? "flex-wrap" : "flex-nowrap"}`}>
      {shown.map((hit) => (
        <span key={hit.chunkId} title={citeLabel(hit)} className={`m-chip min-w-0 ${share ? "flex-1" : "max-w-48"}`}>
          {citeLabel(hit)}
        </span>
      ))}
      {!open && extra > 0 && (
        <button type="button" className="m-chip" onClick={() => setOpen(true)}>
          +{extra} more
        </button>
      )}
    </div>
  );
}

export function ChatPanel({
  title,
  messages,
  draftText,
  liveCitations,
  pending,
  loading,
  error,
  onSend,
  onDelete,
}: {
  title: string;
  messages: ChatMessageRecord[];
  draftText: string;
  liveCitations: Citation[];
  pending: boolean;
  loading: boolean;
  error: string;
  onSend: (text: string) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, draftText, pending]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-8" style={{ borderBottom: "1px solid var(--m-line)" }}>
        <div className="min-w-0">
          <p className="m-kicker">CHAT</p>
          <h1 className="m-title mt-2 truncate">{title}</h1>
        </div>
        {onDelete && (
          <button type="button" onClick={() => setConfirming(true)} disabled={pending} className="m-btn-quiet shrink-0">
            Delete
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        {loading ? (
          <div className="space-y-3">
            <div className="m-skeleton w-24" />
            <div className="m-skeleton w-2/3" />
            <div className="m-skeleton w-1/2" />
          </div>
        ) : messages.length === 0 && !draftText && !pending ? (
          <p className="m-muted max-w-lg text-sm leading-relaxed">
            Ask this workspace. The reply is grounded in the sources that have finished processing.
          </p>
        ) : (
          <ul className="flex w-full flex-col gap-3">
            {messages.map((message) => {
              const mine = message.role === "USER";
              return (
              <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={mine ? "m-bubble m-bubble-user" : "m-bubble m-bubble-agent"}>
                <p className="m-kicker">{mine ? "YOU" : "MOSAIC"}</p>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                {message.citations && message.citations.length > 0 && <CiteRow hits={message.citations} />}
                </div>
              </li>
              );
            })}
            {(draftText || (pending && liveCitations.length > 0)) && (
              <li className="flex justify-start">
                <div className="m-bubble m-bubble-agent">
                <p className="m-kicker">MOSAIC</p>
                <p className="mt-1 whitespace-pre-wrap">{draftText || "Reading the sources"}</p>
                {liveCitations.length > 0 && <CiteRow hits={liveCitations} />}
                </div>
              </li>
            )}
          </ul>
        )}
        {error && <p className="m-muted mt-4 text-sm">{error}</p>}
        <div ref={endRef} />
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete this chat?"
        body="The messages in this thread are removed. The sources stay."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => {
          onDelete?.();
          setConfirming(false);
        }}
        onClose={() => setConfirming(false)}
      />

      <form onSubmit={submit} className="m-dock gap-2 px-4 sm:px-8">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={8000}
          placeholder="Ask about a source"
          disabled={pending}
          className="m-field min-w-0 flex-1 !w-auto"
        />
        <button type="submit" disabled={pending} className="m-btn m-ask">
          {pending ? "Asking" : "Ask"}
        </button>
      </form>
    </div>
  );
}
