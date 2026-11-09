"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { isAbort } from "@/services/api";
import type {
  ArtifactDetail,
  ArtifactStatus,
  ArtifactType,
  SourceStatus,
  SourceType,
  WorkspaceArtifact,
  WorkspaceSource,
} from "@/services/mosaic";
import { Icon, type MosaicIconName } from "./icons";

const KINDS: { type: ArtifactType; label: string; hint: string; icon: MosaicIconName }[] = [
  { type: "SUMMARY", label: "Summary", hint: "A short written overview", icon: "doc" },
  { type: "TAKEAWAYS", label: "Takeaways", hint: "The points worth keeping", icon: "bulb" },
  { type: "FLASHCARDS", label: "Flashcards", hint: "One card at a time", icon: "card" },
  { type: "QUIZ", label: "Quiz", hint: "Questions with instant feedback", icon: "help" },
  { type: "MINDMAP", label: "Mind map", hint: "How the ideas connect", icon: "map" },
  { type: "REPORT", label: "Report", hint: "A longer written piece", icon: "clipboard" },
];

const kindLabel = Object.fromEntries(KINDS.map((item) => [item.type, item.label])) as Record<
  ArtifactType,
  string
>;

const statusLabel: Record<ArtifactStatus, string> = {
  PENDING: "Queued",
  PROCESSING: "Generating",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

const sourceStatusLabel: Record<SourceStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

const sourceGroups: { type: SourceType; label: string }[] = [
  { type: "PDF", label: "PDF" },
  { type: "WEBSITE", label: "Websites" },
  { type: "YOUTUBE", label: "YouTube" },
  { type: "TEXT", label: "Notes" },
  { type: "MARKDOWN", label: "Markdown" },
];

type Card = { front: string; back: string };
type Question = { question: string; choices: string[]; answerIndex: number };
type MindNode = { label: string; children?: MindNode[] };
type Section = { heading: string; body: string };

type Study =
  | { kind: "summary"; text: string }
  | { kind: "takeaways"; items: string[] }
  | { kind: "cards"; cards: Card[] }
  | { kind: "quiz"; questions: Question[] }
  | { kind: "mind"; root: MindNode }
  | { kind: "report"; title: string; sections: Section[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textList(value: unknown, max: number) {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) return null;
    items.push(item);
  }
  return items;
}

function mindNode(value: unknown, depth: number): MindNode | null {
  if (!isRecord(value) || typeof value.label !== "string" || value.label.trim().length === 0) return null;
  if (value.children === undefined || depth >= 2) return { label: value.label };
  if (!Array.isArray(value.children) || value.children.length > 8) return null;
  const children: MindNode[] = [];
  for (const child of value.children) {
    const node = mindNode(child, depth + 1);
    if (!node) return null;
    children.push(node);
  }
  return children.length > 0 ? { label: value.label, children } : { label: value.label };
}

function studyOf(type: ArtifactType, content: unknown): Study | null {
  if (!isRecord(content)) return null;
  if (type === "SUMMARY" && typeof content.summary === "string" && content.summary.trim()) {
    return { kind: "summary", text: content.summary };
  }
  if (type === "TAKEAWAYS") {
    const items = textList(content.takeaways, 8);
    return items ? { kind: "takeaways", items } : null;
  }
  if (type === "FLASHCARDS" && Array.isArray(content.cards) && content.cards.length > 0 && content.cards.length <= 20) {
    const cards: Card[] = [];
    for (const card of content.cards) {
      if (!isRecord(card) || typeof card.front !== "string" || typeof card.back !== "string") return null;
      if (!card.front.trim() || !card.back.trim()) return null;
      cards.push({ front: card.front, back: card.back });
    }
    return { kind: "cards", cards };
  }
  if (type === "QUIZ" && Array.isArray(content.questions) && content.questions.length > 0 && content.questions.length <= 10) {
    const questions: Question[] = [];
    for (const question of content.questions) {
      if (!isRecord(question) || typeof question.question !== "string" || !question.question.trim()) return null;
      const choices = textList(question.choices, 4);
      if (!choices || choices.length < 2 || typeof question.answerIndex !== "number") return null;
      if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= choices.length) {
        return null;
      }
      questions.push({ question: question.question, choices, answerIndex: question.answerIndex });
    }
    return { kind: "quiz", questions };
  }
  if (type === "MINDMAP") {
    const root = mindNode(content.root, 0);
    return root ? { kind: "mind", root } : null;
  }
  if (type === "REPORT" && typeof content.title === "string" && content.title.trim() && Array.isArray(content.sections)) {
    if (content.sections.length === 0 || content.sections.length > 8) return null;
    const sections: Section[] = [];
    for (const section of content.sections) {
      if (!isRecord(section) || typeof section.heading !== "string" || typeof section.body !== "string") return null;
      if (!section.heading.trim() || !section.body.trim()) return null;
      sections.push({ heading: section.heading, body: section.body });
    }
    return { kind: "report", title: content.title, sections };
  }
  return null;
}

function failureMessage(cause: unknown, fallback: string) {
  if (isAbort(cause)) return "";
  return cause instanceof Error ? cause.message : fallback;
}

export function LearnPanel({
  workspaceId,
  sources,
  artifacts,
  details,
  onCreate,
  onLoad,
}: {
  workspaceId: string;
  sources: WorkspaceSource[];
  artifacts: WorkspaceArtifact[];
  details: Record<string, ArtifactDetail>;
  onCreate: (type: ArtifactType, input?: { title?: string; sourceIds?: string[] }) => Promise<ArtifactDetail>;
  onLoad: (artifactId: string) => Promise<ArtifactDetail | null>;
}) {
  const [scope, setScope] = useState(workspaceId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [kind, setKind] = useState<ArtifactType>("SUMMARY");
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const sourcePicker = useRef<HTMLDivElement>(null);
  const guideReader = useRef<HTMLElement>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState("");
  const createTitleId = useId();
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const finished = sources.filter((source) => source.status === "COMPLETED");
  const groups = sourceGroups
    .map((group) => ({ ...group, sources: sources.filter((source) => source.type === group.type) }))
    .filter((group) => group.sources.length > 0);
  const selectedId = artifacts.some((item) => item.id === activeId) ? activeId : (artifacts[0]?.id ?? null);
  if (selectedId !== activeId) setActiveId(selectedId);
  const detail = selectedId ? details[selectedId] : undefined;

  if (scope !== workspaceId) {
    setScope(workspaceId);
    setTitle("");
    setPicked([]);
    setCreateOpen(false);
    setReading(false);
    setSourcesOpen(false);
    setSourceQuery("");
    setNotice("");
    setLoadError("");
    setErrorFor(null);
  }

  if (selectedId !== errorFor) {
    setErrorFor(selectedId);
    setLoadError("");
  }

  useEffect(() => {
    if (!createOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) return;
      if (sourcesOpen) {
        setSourcesOpen(false);
        return;
      }
      setCreateOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen, busy, sourcesOpen]);

  useEffect(() => {
    if (!sourcesOpen) return;
    function onPointer(event: PointerEvent) {
      if (!sourcePicker.current?.contains(event.target as Node)) setSourcesOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [sourcesOpen]);

  useEffect(() => {
    if (!selectedId || details[selectedId]) return;
    let ignore = false;
    void onLoad(selectedId)
      .catch((cause: unknown) => {
        if (ignore) return;
        const message = failureMessage(cause, "Could not open this study guide");
        if (message) setLoadError(message);
      });
    return () => {
      ignore = true;
    };
  }, [selectedId, details, onLoad]);

  useEffect(() => {
    if (!reading) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    guideReader.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [reading, selectedId]);

  function toggleSource(id: string) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 50) return current;
      return [...current, id];
    });
  }

  function toggleGroup(ids: string[]) {
    setPicked((current) => {
      const allOn = ids.length > 0 && ids.every((id) => current.includes(id));
      if (allOn) return current.filter((id) => !ids.includes(id));
      const next = [...current];
      for (const id of ids) {
        if (!next.includes(id) && next.length < 50) next.push(id);
      }
      return next;
    });
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || finished.length === 0) return;
    setBusy(true);
    setNotice("");
    try {
      const created = await onCreate(kind, {
        title,
        ...(picked.length > 0 ? { sourceIds: picked } : {}),
      });
      setActiveId(created.id);
      setTitle("");
      setCreateOpen(false);
      setReading(true);
    } catch (cause) {
      setNotice(failureMessage(cause, "Could not start this study guide"));
    } finally {
      setBusy(false);
    }
  }

  const summary = artifacts.find((item) => item.id === selectedId) ?? null;
  const shown = detail ?? summary;
  const study = detail?.status === "COMPLETED" ? studyOf(detail.type, detail.content) : null;

  const sourceHint =
    sources.length === 0
      ? "Nothing in this workspace yet."
      : finished.length === 0
        ? "A source is here, but it is not ready for a guide yet."
        : picked.length === 0
          ? "Nothing is selected, so this guide uses every finished source."
          : `${picked.length} of ${finished.length} finished sources selected.`;
  const sourceNeedle = sourceQuery.trim().toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      sources: group.sources.filter((source) => source.title.toLowerCase().includes(sourceNeedle)),
    }))
    .filter((group) => group.sources.length > 0);

  return (
    <div className="m-page flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="m-kicker">LEARN</p>
          <h1 className="m-title mt-2">Study guides</h1>
          <p className="m-muted mt-3 max-w-xl text-sm leading-relaxed">
            A guide is written from sources that have finished processing. It stays on this workspace.
          </p>
        </div>
        <button type="button" onClick={() => { setNotice(""); setSourceQuery(""); setSourcesOpen(false); setCreateOpen(true); }} className="m-btn w-full shrink-0 sm:w-auto">
          <Icon name="plus" size={14} />
          Create guide
        </button>
      </div>

      {createOpen && (
      <div className="m-modal-scrim" onMouseDown={() => { if (!busy) setCreateOpen(false); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={createTitleId}
        className="m-modal m-modal-wide"
        onMouseDown={(event) => event.stopPropagation()}
      >
      <form onSubmit={(event) => void create(event)}>
          <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-6 sm:px-7 sm:pt-7">
            <div className="min-w-0">
              <p className="m-kicker">NEW GUIDE</p>
              <h2 id={createTitleId} className="mt-2 text-lg tracking-tight">Create guide</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
              className="m-icon-btn"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="m-split px-5 pt-6 pb-6 sm:px-7 sm:pt-7 sm:pb-7">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {KINDS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setKind(item.type)}
                  data-selected={kind === item.type}
                  aria-pressed={kind === item.type}
                  className="m-tile"
                >
                  <Icon name={item.icon} size={18} />
                  <span>
                    <span className="block text-sm">{item.label}</span>
                    <span className="m-muted mt-1 block text-xs leading-relaxed">{item.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="m-split px-5 py-6 sm:px-7 sm:py-7">
            <label className="block">
              <span className="m-kicker">TITLE</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder={`Leave blank to use ${kindLabel[kind]}`}
                className="m-field mt-2"
              />
            </label>
          </div>

          <div className="m-split px-5 py-6 sm:px-7 sm:py-7">
            <p className="m-kicker">SOURCES</p>
            <p className="m-muted mt-2 text-sm leading-relaxed">{sourceHint}</p>
            <div className="relative mt-3" ref={sourcePicker}>
              <button
                type="button"
                aria-expanded={sourcesOpen}
                aria-haspopup="listbox"
                onClick={() => setSourcesOpen((open) => !open)}
                className="m-field flex items-center justify-between gap-3 text-left"
              >
                <span className="min-w-0 truncate text-sm">
                  {picked.length === 0 ? "All finished sources" : `${picked.length} selected`}
                </span>
                <Icon name="chevron" size={16} className={`shrink-0 transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
              </button>
              {sourcesOpen && (
                <div className="m-menu mt-2 w-full p-2">
                  <div className="m-field flex items-center gap-2">
                    <Icon name="search" size={14} />
                    <input
                      autoFocus
                      value={sourceQuery}
                      onChange={(event) => setSourceQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      placeholder="Search sources"
                      aria-label="Search sources"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  {groups.length === 0 ? (
                    <p className="m-muted px-2 py-4 text-sm">Nothing in this workspace yet.</p>
                  ) : visibleGroups.length === 0 ? (
                    <p className="m-muted px-2 py-4 text-sm">Nothing matches.</p>
                  ) : (
                    <div className="m-list m-scroll mt-2 max-h-60" role="listbox" aria-multiselectable="true">
                      {picked.length > 0 && !sourceNeedle && (
                        <div className="flex justify-end px-3 py-2">
                          <button type="button" onClick={() => setPicked([])} className="m-btn-ghost">
                            Use all
                          </button>
                        </div>
                      )}
                      {visibleGroups.map((group) => {
                        const ready = group.sources.filter((source) => source.status === "COMPLETED");
                        const ids = ready.map((source) => source.id);
                        const allOn = ids.length > 0 && ids.every((id) => picked.includes(id));
                        return (
                          <div key={group.type} className="m-split first:border-t-0">
                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <p className="m-kicker">{group.label.toUpperCase()}</p>
                              {ids.length > 0 && (
                                <button type="button" onClick={() => toggleGroup(ids)} className="m-btn-ghost">
                                  {allOn ? "Clear" : "Select"}
                                </button>
                              )}
                            </div>
                            <ul>
                              {group.sources.map((source) => {
                                const done = source.status === "COMPLETED";
                                return (
                                  <li key={source.id} className="m-line flex min-w-0 items-center gap-3 px-3 py-3">
                                    <input
                                      type="checkbox"
                                      checked={picked.includes(source.id)}
                                      disabled={!done}
                                      onChange={() => toggleSource(source.id)}
                                      aria-label={source.title}
                                      className="size-4 shrink-0"
                                    />
                                    <span className="min-w-0 flex-1 text-sm break-words">{source.title}</span>
                                    <span className="m-chip shrink-0" data-status={source.status}>
                                      {sourceStatusLabel[source.status]}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="m-split flex flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-7">
            <p className="m-muted min-w-0 text-sm">
              {notice ||
                (busy
                  ? `Writing the ${kindLabel[kind].toLowerCase()}. It will open in the list when it starts.`
                  : `Creates a ${kindLabel[kind].toLowerCase()} from the sources above.`)}
            </p>
            <button type="submit" disabled={busy || finished.length === 0} className="m-btn h-auto w-full whitespace-normal px-4 py-2 text-center sm:w-auto">
              {busy ? "Starting" : finished.length === 0 ? "Waiting for a finished source" : `Create ${kindLabel[kind].toLowerCase()}`}
            </button>
          </div>
      </form>
      </div>
      </div>
      )}

      <section className="m-rule mt-10 pt-8">
        <p className="m-kicker">SAVED</p>
        <h2 className="mt-2 text-lg tracking-tight">Guides</h2>
        {artifacts.length === 0 ? (
          <p className="m-muted mt-3 text-sm">None yet.</p>
        ) : (
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
            <ul className={`m-list min-w-0 ${reading ? "max-lg:hidden" : ""}`}>
              {artifacts.map((item) => {
                const open = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(item.id);
                        setReading(true);
                      }}
                      data-selected={open}
                      className="m-item flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug break-words">{item.title}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="m-kicker">{kindLabel[item.type].toUpperCase()}</span>
                          <span className="m-chip" data-status={item.status}>
                            {statusLabel[item.status]}
                          </span>
                        </span>
                      </span>
                      <Icon name="chevronRight" size={16} className="shrink-0 lg:hidden" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <article ref={guideReader} className={`m-card min-w-0 scroll-mt-4 p-4 sm:p-6 ${reading ? "" : "max-lg:hidden"}`}>
              <div className="mb-4 lg:hidden">
                <button type="button" onClick={() => setReading(false)} className="m-btn-quiet min-h-11">
                  <Icon name="chevronLeft" size={16} />
                  All guides
                </button>
              </div>
              <GuideBody shown={shown} detail={detail} study={study} loadError={loadError} />
            </article>
          </div>
        )}
      </section>
    </div>
  );
}

function GuideBody({
  shown,
  detail,
  study,
  loadError,
  compact = false,
}: {
  shown: { id: string; title: string; type: ArtifactType; status: ArtifactStatus } | null;
  detail: ArtifactDetail | undefined;
  study: Study | null;
  loadError: string;
  compact?: boolean;
}) {
  if (!shown) return <p className="m-muted text-sm">Choose a guide to read it.</p>;
  return (
    <>
      {!compact && (
        <div className="min-w-0">
          <p className="m-kicker">{kindLabel[shown.type].toUpperCase()}</p>
          <h2 className="mt-2 text-2xl tracking-tight break-words">{shown.title}</h2>
        </div>
      )}
      {shown.status === "FAILED" && (
        <p className={`m-muted text-sm leading-relaxed ${compact ? "" : "mt-4"}`}>{detail?.error || "This study guide failed."}</p>
      )}
      {shown.status !== "COMPLETED" && shown.status !== "FAILED" && (
        <div className={compact ? "" : "mt-5"}>
          <p className="m-muted text-sm leading-relaxed">
            Writing this {kindLabel[shown.type].toLowerCase()} from the finished sources. It stays in the list and fills in here when it is ready.
          </p>
          <div className="mt-5 space-y-2">
            <div className="m-skeleton w-2/3" />
            <div className="m-skeleton w-full" />
            <div className="m-skeleton w-4/5" />
          </div>
        </div>
      )}
      {loadError && <p className="m-muted mt-4 text-sm">{loadError}</p>}
      {shown.status === "COMPLETED" && !detail && !loadError && (
        <div className="mt-5 space-y-2">
          <div className="m-skeleton w-1/3" />
          <div className="m-skeleton w-full" />
          <div className="m-skeleton w-5/6" />
        </div>
      )}
      {study?.kind === "summary" && (
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{study.text}</p>
      )}
      {study?.kind === "takeaways" && (
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {study.items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
      {study?.kind === "cards" && <Flashcards key={shown.id} cards={study.cards} />}
      {study?.kind === "quiz" && <Quiz key={shown.id} questions={study.questions} />}
      {study?.kind === "mind" && <MindMap root={study.root} />}
      {study?.kind === "report" && (
        <div className="mt-6">
          {study.sections.map((section, index) => (
            <section key={section.heading} className={index === 0 ? "" : "m-split mt-8 pt-8"}>
              <h3 className="text-xl tracking-tight">{section.heading}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{section.body}</p>
            </section>
          ))}
        </div>
      )}
      {detail?.status === "COMPLETED" && !study && (
        <p className="m-muted mt-5 text-sm">This study guide could not be read.</p>
      )}
    </>
  );
}

function Flashcards({ cards }: { cards: Card[] }) {
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const index = Math.min(cursor, cards.length - 1);
  const card = cards[index];
  if (!card) return null;

  function go(next: number) {
    setCursor(next);
    setRevealed(false);
  }

  return (
    <div
      className="mt-6"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" && index < cards.length - 1) go(index + 1);
        if (event.key === "ArrowLeft" && index > 0) go(index - 1);
      }}
    >
      <div className="m-flip">
        <motion.button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className="m-flip-card"
          initial={false}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.62, ease: [0.2, 0.7, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
          aria-label={revealed ? "Hide the answer" : "Reveal the answer"}
        >
          <span className="m-card m-flip-face">
            <span className="max-w-2xl text-xl leading-snug break-words sm:text-2xl">{card.front}</span>
          </span>
          <span className="m-card m-flip-face m-flip-back">
            <span className="max-w-2xl text-xl leading-snug break-words sm:text-2xl">{card.back}</span>
          </span>
        </motion.button>
      </div>
      <p className="m-muted mt-4 text-center text-xs">
        {revealed ? "Tap the card to see the prompt again" : "Tap the card to reveal"}
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className="m-btn-quiet min-h-11 px-3"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          aria-label="Previous card"
        >
          <Icon name="chevronLeft" size={16} />
          <span className="max-[380px]:sr-only">Previous</span>
        </button>
        <p className="m-muted text-sm">
          {index + 1} / {cards.length}
        </p>
        <button
          type="button"
          className="m-btn-quiet min-h-11 px-3"
          disabled={index === cards.length - 1}
          onClick={() => go(index + 1)}
          aria-label="Next card"
        >
          <span className="max-[380px]:sr-only">Next</span>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}

function Quiz({ questions }: { questions: Question[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const answered = Object.keys(picked).length;
  const correctCount = questions.filter((question, index) => picked[index] === question.answerIndex).length;
  return (
    <div className="mt-6">
      <ol>
        {questions.map((question, index) => {
          const choice = picked[index];
          return (
            <li key={question.question} className={index === 0 ? "" : "m-split mt-6 pt-6"}>
              <p className="m-kicker">QUESTION {index + 1}</p>
              <p className="mt-2 text-sm leading-relaxed break-words">{question.question}</p>
              <div className="mt-3 flex flex-col gap-2">
                {question.choices.map((label, choiceIndex) => {
                  const selected = choice === choiceIndex;
                  const correct = choice !== undefined && choiceIndex === question.answerIndex;
                  const wrong = selected && choiceIndex !== question.answerIndex;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={choice !== undefined}
                      onClick={() => setPicked((current) => ({ ...current, [index]: choiceIndex }))}
                      data-result={correct ? "right" : wrong ? "wrong" : undefined}
                      className="m-choice"
                    >
                      <span className="min-w-0 break-words">{label}</span>
                      {correct && <Icon name="check" size={16} />}
                      {wrong && <Icon name="close" size={16} />}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      {answered > 0 && (
        <p className="m-muted mt-6 text-sm">
          {correctCount} of {questions.length} correct
        </p>
      )}
    </div>
  );
}

function MindMap({ root }: { root: MindNode }) {
  return (
    <div className="mt-6 flex flex-col items-stretch gap-4 sm:items-center">
      <div className="m-card w-full px-4 py-3 text-center text-sm leading-relaxed break-words sm:w-auto sm:max-w-md">
        {root.label}
      </div>
      {root.children && root.children.length > 0 && (
        <>
          <div className="mx-auto hidden h-6 w-px sm:block" style={{ background: "var(--m-line-strong)" }} />
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {root.children.map((child, index) => (
              <div key={`${index}-${child.label}`} className="m-card min-w-0 p-4">
                <p className="text-sm leading-relaxed break-words">{child.label}</p>
                {child.children && child.children.length > 0 && (
                  <ul className="m-split mt-3 space-y-2 pt-3">
                    {child.children.map((leaf, leafIndex) => (
                      <li key={`${leafIndex}-${leaf.label}`} className="m-muted text-sm leading-relaxed break-words">
                        {leaf.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
