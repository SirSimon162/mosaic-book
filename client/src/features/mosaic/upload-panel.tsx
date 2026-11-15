"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { BookWithClips } from "./book-with-clips";
import { ConfirmDialog } from "./confirm";
import { FolderGrid, itemCountLabel, type FolderCardData } from "./folder-card";
import { Icon, type MosaicIconName } from "./icons";
import { useToast } from "./toast";
import { isAbort } from "@/services/api";
import { MOSAIC } from "@/services/mosaic";
import type {
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

const folderKinds: SourceType[] = ["PDF", "WEBSITE", "YOUTUBE", "TEXT", "MARKDOWN"];

const typeIcon: Record<SourceType, MosaicIconName> = {
  PDF: "file",
  WEBSITE: "link",
  YOUTUBE: "link",
  TEXT: "pencil",
  MARKDOWN: "doc",
};

const MAX_PDF_BYTES = 50 * 1024 * 1024;

type Busy = "file" | "url" | "note" | "delete" | "refresh" | "reprocess" | "passage";
type SortKey = "title" | "type" | "status";
type UploadTab = "pdf" | "link" | "note";
type UiStatus = "uploading" | "processing" | "ready" | "failed";

type LocalUpload = {
  id: string;
  title: string;
  type: SourceType;
  progress: number;
};

type UndoDelete = {
  ids: string[];
  snapshot: WorkspaceSource[];
  timer: number;
};

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
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

function uiStatus(status: SourceStatus): UiStatus {
  if (status === "COMPLETED") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "PROCESSING") return "processing";
  return "processing";
}

function statusCopy(status: UiStatus) {
  if (status === "uploading") return "Uploading";
  if (status === "processing") return "Processing";
  if (status === "ready") return "Ready";
  return "Failed";
}

function StatusPill({
  status,
  progress,
  error,
  onRetry,
}: {
  status: UiStatus;
  progress?: number;
  error?: string | null;
  onRetry?: () => void;
}) {
  const apiStatus =
    status === "ready" ? "COMPLETED" : status === "failed" ? "FAILED" : status === "uploading" ? "PENDING" : "PROCESSING";
  return (
    <div className="m-status">
      <span className="m-chip m-status-pill" data-status={apiStatus}>
        <Icon
          name={status === "ready" ? "check" : status === "failed" ? "close" : status === "uploading" ? "upload" : "refresh"}
          size={12}
        />
        {statusCopy(status)}
      </span>
      {(status === "uploading" || status === "processing") && (
        <span className="m-status-bar" aria-hidden>
          <span style={{ width: `${Math.max(8, Math.min(100, progress ?? (status === "uploading" ? 35 : 62)))}%` }} />
        </span>
      )}
      {status === "failed" && error ? <p className="m-status-error">{error}</p> : null}
      {status === "failed" && onRetry ? (
        <button type="button" className="m-btn-quiet m-status-retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
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
  onChatWithSources,
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
  onChatWithSources?: (ids: string[]) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<UploadTab>("pdf");
  const [url, setUrl] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<"TEXT" | "MARKDOWN">("TEXT");
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<SourceType | null>(null);
  const [sort, setSort] = useState<SortKey>("title");
  const [sortOpen, setSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SourceDetail>>({});
  const [busy, setBusy] = useState<Busy | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const undoRef = useRef<UndoDelete | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [passage, setPassage] = useState("");
  const [hits, setHits] = useState<Citation[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
    type: SourceType;
    loading: boolean;
    text: string | null;
    error: string;
  } | null>(null);
  const passageAbort = useRef<AbortController | null>(null);
  const prevStatuses = useRef<Record<string, SourceStatus>>({});

  const readyCount = useMemo(
    () => sources.filter((source) => source.status === "COMPLETED").length,
    [sources],
  );

  const folders = useMemo<FolderCardData[]>(() => {
    return folderKinds.map((type) => {
      const count = sources.filter((source) => source.type === type && !hiddenIds.has(source.id)).length;
      return {
        id: type,
        title: kindLabel[type],
        itemCount: count,
        coverTone: type,
        actionType: "menu",
      };
    });
  }, [sources, hiddenIds]);

  const library = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = sources.filter((source) => {
      if (hiddenIds.has(source.id)) return false;
      if (folder && source.type !== folder) return false;
      if (needle && !source.title.toLowerCase().includes(needle)) return false;
      return true;
    });
    const rank: Record<SourceStatus, number> = {
      FAILED: 0,
      PROCESSING: 1,
      PENDING: 2,
      COMPLETED: 3,
    };
    rows.sort((a, b) => {
      if (sort === "type") return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
      if (sort === "status") return rank[a.status] - rank[b.status] || a.title.localeCompare(b.title);
      return a.title.localeCompare(b.title);
    });
    return rows;
  }, [sources, query, folder, sort, hiddenIds]);

  const locked = busy !== null;
  const selectedIds = library.filter((source) => selected.has(source.id)).map((source) => source.id);
  const selectedCount = selectedIds.length;
  const allVisibleSelected = library.length > 0 && selectedCount === library.length;

  useEffect(() => {
    const prev = prevStatuses.current;
    const next: Record<string, SourceStatus> = {};
    const changes: string[] = [];
    const ready: string[] = [];
    const failed: string[] = [];
    for (const source of sources) {
      next[source.id] = source.status;
      if (prev[source.id] && prev[source.id] !== source.status) {
        changes.push(`${source.title} is now ${statusCopy(uiStatus(source.status)).toLowerCase()}`);
        if (source.status === "COMPLETED") ready.push(source.title);
        if (source.status === "FAILED") failed.push(source.title);
      }
    }
    prevStatuses.current = next;
    if (!changes.length) return;
    const timer = window.setTimeout(() => {
      setLiveMessage(changes.join(". "));
      if (ready.length === 1) toast.success("Source ready", ready[0]);
      else if (ready.length > 1) toast.success(`${ready.length} sources ready`);
      if (failed.length === 1) toast.error("Source failed", failed[0]);
      else if (failed.length > 1) toast.error(`${failed.length} sources failed`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sources, toast]);

  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
      passageAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!rowMenu) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-row-menu]")) return;
      setRowMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [rowMenu]);

  useEffect(() => {
    if (!sortOpen) return;
    function onDoc(event: MouseEvent) {
      if (sortMenuRef.current?.contains(event.target as Node)) return;
      setSortOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!preview) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const sortLabels: Record<SortKey, string> = {
    title: "Title",
    type: "Type",
    status: "Status",
  };

  async function addFiles(list: FileList | File[] | null) {
    if (!list || locked) return;
    const files = [...list];
    const problems = files.map(pdfProblem).filter(Boolean);
    const accepted = files.filter((file) => !pdfProblem(file));
    if (fileRef.current) fileRef.current.value = "";
    if (accepted.length === 0) {
      toast.error("Could not upload", problems[0] || "Choose a PDF");
      return;
    }
    if (problems.length) {
      toast.info("Some files skipped", problems.filter(Boolean).join(" "));
    }
    setBusy("file");
    const staged: LocalUpload[] = accepted.map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      title: pdfTitle(file),
      type: "PDF",
      progress: 18,
    }));
    setLocalUploads((current) => [...staged, ...current]);
    setLiveMessage(`Uploading ${itemCountLabel(accepted.length)}`);
    let failed = 0;
    try {
      await runPool(
        accepted.map((file, index) => ({ file, local: staged[index]! })),
        2,
        async ({ file, local }) => {
          setLocalUploads((current) =>
            current.map((item) => (item.id === local.id ? { ...item, progress: 55 } : item)),
          );
          try {
            await onPdf(file, pdfTitle(file));
          } catch (cause) {
            failed += 1;
            toast.error("Upload failed", failureMessage(cause, `Could not upload ${file.name}`));
          } finally {
            setLocalUploads((current) => current.filter((item) => item.id !== local.id));
          }
        },
      );
      const ok = accepted.length - failed;
      if (ok > 0) {
        toast.success(
          ok === 1 ? "PDF uploaded" : `${ok} PDFs uploaded`,
          "Processing will start shortly",
        );
      }
      setLiveMessage("Upload finished");
    } finally {
      setBusy(null);
      setLocalUploads([]);
    }
  }

  async function addUrl(event?: FormEvent) {
    event?.preventDefault();
    if (locked) return;
    let link: ReturnType<typeof materialLink>;
    try {
      link = materialLink(url);
    } catch (cause) {
      toast.error("Invalid link", failureMessage(cause, "Enter a full link, including https://"));
      return;
    }
    const localId = `local-url-${Date.now()}`;
    setLocalUploads((current) => [
      { id: localId, title: link.title, type: link.kind === "youtube" ? "YOUTUBE" : "WEBSITE", progress: 40 },
      ...current,
    ]);
    setBusy("url");
    try {
      if (link.kind === "youtube") await onYouTube(link.url, link.title);
      else await onWebsite(link.url, link.title);
      setUrl("");
      setLiveMessage(`${link.title} added`);
      toast.success(
        link.kind === "youtube" ? "YouTube added" : "Website added",
        link.title,
      );
    } catch (cause) {
      toast.error("Import failed", failureMessage(cause, "Could not import that link"));
    } finally {
      setLocalUploads((current) => current.filter((item) => item.id !== localId));
      setBusy(null);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const title = noteTitle.trim();
    const content = noteBody.trim();
    if (!title || !content) {
      toast.error("Missing details", "Add a title and some text");
      return;
    }
    const localId = `local-note-${Date.now()}`;
    setLocalUploads((current) => [
      { id: localId, title, type: noteType, progress: 50 },
      ...current,
    ]);
    setBusy("note");
    try {
      await onNote({ type: noteType, title: title.slice(0, 200), content });
      setNoteTitle("");
      setNoteBody("");
      setLiveMessage(`${title} saved`);
      toast.success("Note saved", title);
    } catch (cause) {
      toast.error("Could not save", failureMessage(cause, "Could not save the note"));
    } finally {
      setLocalUploads((current) => current.filter((item) => item.id !== localId));
      setBusy(null);
    }
  }

  function queueDelete(ids: string[], confirm = false) {
    if (ids.length === 0) return;
    if (confirm) {
      setConfirmDelete(ids);
      return;
    }
    if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
    const snapshot = sources.filter((source) => ids.includes(source.id));
    setHiddenIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setRowMenu(null);
    const timer = window.setTimeout(() => {
      deleteTimerRef.current = null;
      void onDelete(ids)
        .then(() => {
          setLiveMessage(ids.length === 1 ? "Source deleted" : "Sources deleted");
        })
        .catch((cause) => toast.error("Delete failed", failureMessage(cause, "Could not remove the source")))
        .finally(() => {
          setHiddenIds((current) => {
            const next = new Set(current);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          undoRef.current = null;
        });
    }, 6000);
    deleteTimerRef.current = timer;
    const pending = { ids, snapshot, timer };
    undoRef.current = pending;
    setLiveMessage("Deleted. Undo available for 6 seconds.");
    toast.push({
      title: ids.length === 1 ? "Source deleted" : `${ids.length} sources deleted`,
      description: "You can undo for a few seconds",
      tone: "warning",
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => undoDelete(),
      },
    });
  }

  function undoDelete() {
    const pending = undoRef.current;
    if (!pending) return;
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setHiddenIds((current) => {
      const next = new Set(current);
      pending.ids.forEach((id) => next.delete(id));
      return next;
    });
    undoRef.current = null;
    setLiveMessage("Delete undone");
    toast.success("Delete undone");
  }

  async function reprocess(ids: string[]) {
    if (locked || ids.length === 0) return;
    setBusy("reprocess");
    try {
      await onReprocess(ids);
      setSelected(new Set());
      setLiveMessage("Reprocessing started");
      toast.info(
        ids.length === 1 ? "Reprocessing source" : `Reprocessing ${ids.length} sources`,
        "We'll notify you when they're ready",
      );
    } catch (cause) {
      toast.error("Reprocess failed", failureMessage(cause, "Could not process those sources again"));
    } finally {
      setBusy(null);
      setRowMenu(null);
    }
  }

  async function refreshLibrary() {
    if (locked) return;
    setBusy("refresh");
    try {
      await onRefresh();
      toast.success("Library refreshed");
    } catch (cause) {
      toast.error("Refresh failed", failureMessage(cause, "Could not refresh sources"));
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
    setSearchOpen(true);
    try {
      const next = await MOSAIC.searchSources(workspaceId, { query: queryText }, controller.signal);
      if (!controller.signal.aborted) {
        setHits(next);
        setSearched(true);
        setLiveMessage(next.length ? `Found ${next.length} passages` : "No passages matched");
        if (next.length) toast.success(`Found ${next.length} passages`);
        else toast.info("No close matches", "Try a quote from View content");
      }
    } catch (cause) {
      if (!isAbort(cause)) toast.error("Search failed", failureMessage(cause, "Could not search these sources"));
    } finally {
      if (passageAbort.current === controller) {
        passageAbort.current = null;
        setBusy(null);
      }
    }
  }

  async function loadDetail(id: string) {
    const cached = detailCache[id];
    if (cached) return cached;
    const detail = await MOSAIC.getSource(workspaceId, id);
    setDetailCache((current) => ({ ...current, [id]: detail }));
    return detail;
  }

  async function openSource(id: string) {
    setRowMenu(null);
    try {
      const detail = await loadDetail(id);
      const link = safeHttp(detail.url) || safeHttp(detail.fileUrl);
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      else toast.info("Nothing to open", "No openable link for this source");
    } catch (cause) {
      toast.error("Could not open", failureMessage(cause, "Could not open this source"));
    }
  }

  async function viewContent(id: string) {
    const row = sources.find((source) => source.id === id);
    if (!row) return;
    setRowMenu(null);
    setPreview({
      id,
      title: row.title,
      type: row.type,
      loading: true,
      text: null,
      error: "",
    });
    try {
      const detail = await loadDetail(id);
      const text = detail.source?.trim() || null;
      setPreview({
        id,
        title: detail.title || row.title,
        type: detail.type,
        loading: false,
        text,
        error: text ? "" : "No extracted text yet. If this stays empty, try Reprocess.",
      });
      if (text) {
        toast.success(
          "Content loaded",
          `${text.length.toLocaleString()} characters from ${kindLabel[detail.type]}`,
        );
      } else {
        toast.info("No text found", "This source has nothing extracted yet");
      }
    } catch (cause) {
      const message = failureMessage(cause, "Could not load source content");
      setPreview({
        id,
        title: row.title,
        type: row.type,
        loading: false,
        text: null,
        error: message,
      });
      toast.error("Could not load content", message);
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
    const ids = library.map((source) => source.id);
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

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    setTab("pdf");
    void addFiles(event.dataTransfer.files);
  }

  return (
    <div className="m-page m-upload flex flex-col gap-8">
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      <header>
        <p className="m-kicker">SOURCES</p>
        <h1 className="m-title mt-2">Upload</h1>
        <p className="m-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Add PDFs, links, or notes. Ready sources can be searched and used in chat.
        </p>
      </header>

      <section className="m-upload-zone" aria-label="Upload sources">
        <BookWithClips
          activeId={tab}
          onChange={(id) => setTab(id as UploadTab)}
          renderPanel={(clip) => {
            if (clip.id === "pdf") {
              return (
                <label
                  className={`m-book-drop ${dragging ? "is-dragging" : ""} ${locked ? "pointer-events-none opacity-60" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <Icon name="upload" size={28} />
                  <span className="mt-3 text-lg tracking-tight">
                    {busy === "file" ? "Uploading…" : "Drag & drop or click to upload"}
                  </span>
                  <span className="m-muted mt-2 text-sm">PDF only · up to 50 MB each · multiple files</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="sr-only"
                    onChange={(event) => void addFiles(event.target.files)}
                  />
                </label>
              );
            }

            if (clip.id === "link") {
              return (
                <form onSubmit={(event) => void addUrl(event)} className="m-book-link">
                  <p className="text-lg tracking-tight">Add a link</p>
                  <p className="m-muted mt-1 text-sm">Paste a website or YouTube URL.</p>
                  <input
                    ref={urlRef}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://"
                    disabled={locked}
                    className="m-field mt-4"
                    aria-label="Source URL"
                  />
                  <button type="submit" disabled={locked} className="m-btn mt-3">
                    {busy === "url" ? "Importing" : "Add link"}
                  </button>
                </form>
              );
            }

            const words = noteBody.trim() ? noteBody.trim().split(/\s+/).length : 0;
            return (
              <form onSubmit={(event) => void addNote(event)} className="m-book-note">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg tracking-tight">Write a note</p>
                  <div className="m-segment">
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
                        data-selected={noteType === value}
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
                  className="m-field"
                />
                <textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  rows={5}
                  placeholder="Write or paste the note"
                  maxLength={100000}
                  disabled={locked}
                  className="m-field m-book-lined mt-2"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="m-muted text-xs">
                    {noteBody.length} characters · {words} {words === 1 ? "word" : "words"}
                  </p>
                  <button type="submit" disabled={locked} className="m-btn">
                    {busy === "note" ? "Saving" : "Save note"}
                  </button>
                </div>
              </form>
            );
          }}
        />
      </section>

      <section className="m-upload-search" aria-label="Search sources">
        <form onSubmit={(event) => void findPassage(event)} className="m-upload-search-bar">
          <Icon name="search" size={16} />
          <input
            value={passage}
            onChange={(event) => setPassage(event.target.value)}
            maxLength={8000}
            placeholder="Ask about a topic, or paste a quote"
            disabled={locked}
            className="m-field m-upload-search-input"
          />
          <button type="submit" disabled={locked} className="m-btn">
            {busy === "passage" ? "Searching" : "Search"}
          </button>
        </form>
        <p className="m-muted mt-2 text-sm">
          Meaning search across {readyCount} ready {readyCount === 1 ? "source" : "sources"}. Not exact keyword match —
          use View content to read the full text.
        </p>
      </section>

      <section className="m-upload-library" aria-label="Source library">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="m-kicker">LIBRARY</p>
            <h2 className="mt-1 text-lg tracking-tight">Sources</h2>
          </div>
          <button type="button" onClick={() => void refreshLibrary()} disabled={locked} className="m-btn-quiet">
            <Icon name="refresh" size={14} />
            {busy === "refresh" ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <FolderGrid
          className="mt-10"
          folders={folders}
          compact
          selectedId={folder}
          onFolderClick={(item) => {
            const type = item.id as SourceType;
            setFolder((current) => (current === type ? null : type));
            setSelected(new Set());
            setRowMenu(null);
          }}
        />

        <div className="m-library-tools mt-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by title"
            className="m-field m-field-grow"
            aria-label="Filter sources by title"
          />
          <div className="m-tool-menu" ref={sortMenuRef}>
            <button
              type="button"
              className="m-icon-btn"
              aria-label={`Sort by ${sortLabels[sort]}`}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              title={`Sort by ${sortLabels[sort]}`}
              onClick={() => {
                setRowMenu(null);
                setSortOpen((open) => !open);
              }}
            >
              <Icon name="sort" size={16} />
            </button>
            {sortOpen && (
              <div className="m-menu m-tool-dropdown p-1" role="menu" aria-label="Sort sources">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sort === key}
                    className="m-item flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                    data-selected={sort === key || undefined}
                    onClick={() => {
                      setSort(key);
                      setSortOpen(false);
                    }}
                  >
                    <span>{sortLabels[key]}</span>
                    {sort === key ? <Icon name="check" size={14} /> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="m-icon-btn"
            aria-pressed={allVisibleSelected}
            aria-label={allVisibleSelected ? "Clear selection" : "Select all"}
            title={allVisibleSelected ? "Clear selection" : "Select all"}
            onClick={toggleAllVisible}
            disabled={library.length === 0}
          >
            <Icon name="selectAll" size={16} />
          </button>
        </div>

        {selectedCount > 0 && (
          <div className="m-bulk mt-3" role="region" aria-label="Bulk actions">
            <p className="text-sm">{selectedCount} selected</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="m-btn"
                disabled={!onChatWithSources || selectedIds.every((id) => sources.find((s) => s.id === id)?.status !== "COMPLETED")}
                onClick={() =>
                  onChatWithSources?.(
                    selectedIds.filter((id) => sources.find((source) => source.id === id)?.status === "COMPLETED"),
                  )
                }
              >
                <Icon name="chat" size={14} />
                Chat with selected
              </button>
              <button type="button" className="m-btn-quiet" disabled={locked} onClick={() => void reprocess(selectedIds)}>
                Reprocess
              </button>
              <button type="button" className="m-btn-quiet" disabled={locked} onClick={() => queueDelete(selectedIds)}>
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="m-source-table mt-4" role="table" aria-label="Sources">
          <div className="m-source-head" role="row">
            <span role="columnheader" className="m-source-check">
              <span className="sr-only">Select</span>
            </span>
            <span role="columnheader">Title</span>
            <span role="columnheader" className="m-source-type">
              Type
            </span>
            <span role="columnheader" className="m-source-added">
              Added
            </span>
            <span role="columnheader" className="m-source-status">
              Status
            </span>
            <span role="columnheader" className="m-source-actions">
              <span className="sr-only">Actions</span>
            </span>
          </div>

          {localUploads.map((item) => (
            <div key={item.id} className="m-source-row" role="row">
              <span className="m-source-check" />
              <div className="m-source-title">
                <Icon name={typeIcon[item.type]} size={14} />
                <span className="truncate">{item.title}</span>
              </div>
              <span className="m-source-type">
                <span className="m-chip m-type-pill">{kindLabel[item.type]}</span>
              </span>
              <span className="m-source-added m-muted text-sm">Just now</span>
              <div className="m-source-status">
                <StatusPill status="uploading" progress={item.progress} />
              </div>
              <span className="m-source-actions" />
            </div>
          ))}

          {library.length === 0 && localUploads.length === 0 && (
            <div className="m-empty">
              <p className="text-sm">No sources yet.</p>
              <p className="m-muted mt-1 text-sm">
                {folder
                  ? `Nothing in ${kindLabel[folder]} yet.`
                  : tab === "link"
                    ? "Add a website or YouTube link to get started."
                    : tab === "note"
                      ? "Write a note to keep a passage in this workspace."
                      : "Upload a PDF to get started."}
              </p>
            </div>
          )}

          {library.map((source) => {
            const status = uiStatus(source.status);
            return (
              <div key={source.id} className="m-source-row" role="row" data-selected={selected.has(source.id) || undefined}>
                <span className="m-source-check">
                  <input
                    type="checkbox"
                    checked={selected.has(source.id)}
                    onChange={() => toggleSelected(source.id)}
                    aria-label={`Select ${source.title}`}
                    className="size-4"
                  />
                </span>
                <div className="m-source-title">
                  <Icon name={typeIcon[source.type]} size={14} />
                  <span className="truncate" title={source.title}>
                    {source.title}
                  </span>
                </div>
                <span className="m-source-type">
                  <span className="m-chip m-type-pill">{kindLabel[source.type]}</span>
                </span>
                <span className="m-source-added m-muted text-sm">—</span>
                <div className="m-source-status">
                  <StatusPill
                    status={status}
                    error={source.error}
                    onRetry={status === "failed" ? () => void reprocess([source.id]) : undefined}
                  />
                </div>
                <div className="m-source-actions" data-row-menu>
                  {status === "ready" && onChatWithSources && (
                    <button
                      type="button"
                      className="m-btn-quiet m-chat-btn"
                      onClick={() => onChatWithSources([source.id])}
                    >
                      Chat
                    </button>
                  )}
                  <button
                    type="button"
                    className="m-icon-btn"
                    aria-label={`More for ${source.title}`}
                    aria-expanded={rowMenu === source.id}
                    onClick={() => setRowMenu((current) => (current === source.id ? null : source.id))}
                  >
                    <Icon name="more" size={16} />
                  </button>
                  {rowMenu === source.id && (
                    <div className="m-menu m-row-menu p-1" role="menu">
                      <button type="button" className="m-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => void viewContent(source.id)}>
                        View content
                      </button>
                      <button type="button" className="m-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => void openSource(source.id)}>
                        Open
                      </button>
                      <button type="button" className="m-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => void reprocess([source.id])}>
                        Reprocess
                      </button>
                      <button type="button" className="m-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => queueDelete([source.id])}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {searchOpen && (
        <aside className="m-search-panel" aria-label="Search results">
          <div className="m-search-panel-head">
            <div>
              <p className="m-kicker">RESULTS</p>
              <h2 className="mt-1 text-lg tracking-tight">
                {busy === "passage" ? "Searching…" : searched ? `${hits.length} matches` : "Search"}
              </h2>
            </div>
            <button type="button" className="m-icon-btn" aria-label="Close results" onClick={() => setSearchOpen(false)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="m-search-panel-body">
            {busy === "passage" && <p className="m-muted text-sm">Looking through ready sources…</p>}
            {searched && hits.length === 0 && busy !== "passage" && (
              <div className="m-empty">
                <p className="text-sm">No closely related passages.</p>
                <p className="m-muted mt-1 text-sm">
                  This search looks for meaning, not exact words. Open a source menu and choose View content to confirm the transcript, then search with a quote from it.
                </p>
              </div>
            )}
            {hits.map((hit) => (
              <article key={hit.chunkId} className="m-hit-card">
                <p className="m-hit-snippet text-sm leading-relaxed">{hit.snippet}</p>
                <div className="m-hit-meta mt-3">
                  <span className="m-chip" title={hit.sourceTitle}>
                    {hit.sourceTitle}
                  </span>
                  {hit.page ? <span className="m-chip shrink-0">p.{hit.page}</span> : null}
                </div>
                <div className="m-hit-actions mt-3">
                  <button type="button" className="m-btn-quiet" onClick={() => void openSource(hit.sourceId)}>
                    Open source
                  </button>
                  {onChatWithSources && (
                    <button
                      type="button"
                      className="m-btn"
                      onClick={() => onChatWithSources([hit.sourceId])}
                    >
                      Ask in chat
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </aside>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete && confirmDelete.length > 1 ? "Delete these sources?" : "Delete this source?"}
        body="This removes the source from the workspace. Chats that cited it keep their old replies."
        confirmLabel="Delete"
        pending={busy === "delete"}
        onConfirm={() => {
          if (!confirmDelete) return;
          queueDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onClose={() => setConfirmDelete(null)}
      />

      {preview && (
        <div className="m-modal-scrim" onMouseDown={() => setPreview(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={preview.title}
            className="m-modal m-modal-wide m-source-preview"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="m-source-preview-head">
              <div className="min-w-0">
                <p className="m-kicker">{kindLabel[preview.type]}</p>
                <h2 className="mt-1 truncate text-lg tracking-tight">{preview.title}</h2>
                {!preview.loading && preview.text ? (
                  <p className="m-muted mt-1 text-sm">
                    {preview.text.length.toLocaleString()} characters extracted
                  </p>
                ) : null}
              </div>
              <button type="button" className="m-icon-btn" aria-label="Close" onClick={() => setPreview(null)}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="m-source-preview-body">
              {preview.loading ? (
                <p className="m-muted text-sm">Loading extracted text…</p>
              ) : preview.text ? (
                <pre className="m-source-preview-text">{preview.text}</pre>
              ) : (
                <div className="m-empty">
                  <p className="text-sm">{preview.error || "No extracted text."}</p>
                </div>
              )}
            </div>
            <div className="m-source-preview-foot">
              <button type="button" className="m-btn-quiet" onClick={() => void openSource(preview.id)}>
                Open original
              </button>
              <button type="button" className="m-btn" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
