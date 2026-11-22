"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "./confirm";
import { ChatMarkdown } from "./chat-markdown";
import {
  applyEditorFormat,
  clearEditor,
  editorIsEmpty,
  htmlToMarkdown,
  queryFormatActive,
  type FormatKind,
} from "./composer-format";
import { Icon } from "./icons";
import { useToast } from "./toast";
import type { ChatMessageRecord, Citation } from "@/services/mosaic";

export { UploadPanel } from "./upload-panel";

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
      {open && hits.length > 4 && (
        <button type="button" className="m-chip" onClick={() => setOpen(false)}>
          Show less
        </button>
      )}
    </div>
  );
}

function ChatBubble({
  mine,
  children,
  citations,
}: {
  mine: boolean;
  children: ReactNode;
  citations?: Citation[];
}) {
  return (
    <div className={mine ? "m-bubble m-bubble-user" : "m-bubble m-bubble-agent"}>
      <p className="m-kicker">{mine ? "YOU" : "MOSAIC"}</p>
      <div className="m-bubble-content mt-1">{children}</div>
      {citations && citations.length > 0 ? <CiteRow hits={citations} /> : null}
    </div>
  );
}

const FORMAT_TOOLS: { kind: FormatKind; tip: string; label: ReactNode }[] = [
  { kind: "bold", tip: "Bold", label: <span className="font-semibold">B</span> },
  { kind: "italic", tip: "Italic", label: <span className="italic">I</span> },
  { kind: "code", tip: "Inline code", label: <span className="font-tertiary text-[12px]">{"</>"}</span> },
  { kind: "block", tip: "Code block", label: <span className="font-tertiary text-[11px]">{"```"}</span> },
];

const THINKING_BEATS = [
  "🔍 Digging through your sources…",
  "🧠 Tinkering with the question…",
  "📚 Matching passages…",
  "✨ Cross-checking the room…",
  "🧭 Tracing names and phrases…",
  "🧩 Piecing the answer together…",
  "⚡ Warming up the reply…",
];

function ThinkingStatus({ hint }: { hint: string }) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setBeat((current) => (current + 1) % THINKING_BEATS.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, []);
  const statusLine = hint.startsWith("Did you mean") ? THINKING_BEATS[beat] : hint || THINKING_BEATS[beat];
  const rewriteLine = hint.startsWith("Did you mean") ? hint : "";
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="m-thinking">
        <span className="m-thinking-dot" aria-hidden />
        <p className="m-thinking-line">{statusLine}</p>
      </div>
      {rewriteLine ? <p className="m-thinking-hint">{rewriteLine}</p> : null}
    </div>
  );
}

export function ChatPanel({
  title,
  messages,
  draftText,
  liveCitations,
  statusText = "",
  pending,
  loading,
  error,
  scopedSources = [],
  onSend,
  onDelete,
  onClearScope,
  onRemoveScope,
}: {
  title: string;
  messages: ChatMessageRecord[];
  draftText: string;
  liveCitations: Citation[];
  statusText?: string;
  pending: boolean;
  loading: boolean;
  error: string;
  scopedSources?: { id: string; title: string }[];
  onSend: (text: string) => void;
  onDelete?: () => void;
  onClearScope?: () => void;
  onRemoveScope?: (id: string) => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [active, setActive] = useState<Record<FormatKind, boolean>>({
    bold: false,
    italic: false,
    code: false,
    block: false,
  });
  const endRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, draftText, pending, statusText]);

  useEffect(() => {
    function syncActive() {
      setActive({
        bold: queryFormatActive("bold"),
        italic: queryFormatActive("italic"),
        code: queryFormatActive("code"),
        block: queryFormatActive("block"),
      });
    }
    document.addEventListener("selectionchange", syncActive);
    return () => document.removeEventListener("selectionchange", syncActive);
  }, []);

  function syncEmpty() {
    const node = editorRef.current;
    if (!node) return;
    setEmpty(editorIsEmpty(node));
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const node = editorRef.current;
    if (!node || pending) return;
    const text = htmlToMarkdown(node);
    if (!text) return;
    onSend(text);
    clearEditor(node);
    setEmpty(true);
    setActive({ bold: false, italic: false, code: false, block: false });
  }

  function onComposerKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyFormat("bold");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyFormat("italic");
    }
  }

  function applyFormat(kind: FormatKind) {
    const node = editorRef.current;
    if (!node || pending) return;
    node.focus();
    applyEditorFormat(kind);
    syncEmpty();
    setActive({
      bold: queryFormatActive("bold"),
      italic: queryFormatActive("italic"),
      code: queryFormatActive("code"),
      block: queryFormatActive("block"),
    });
  }

  function onFormatMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
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

      {scopedSources.length > 0 && (
        <div className="m-scope-bar px-4 py-3 sm:px-8" aria-label="Scoped sources">
          <p className="m-kicker shrink-0">SCOPED TO</p>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {scopedSources.map((source) => (
              <button
                key={source.id}
                type="button"
                className="m-chip"
                title={`Remove ${source.title}`}
                onClick={() => onRemoveScope?.(source.id)}
              >
                {source.title}
                <Icon name="close" size={12} />
              </button>
            ))}
          </div>
          {onClearScope && (
            <button type="button" className="m-btn-ghost shrink-0" onClick={onClearScope}>
              Clear
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        {loading ? (
          <div className="space-y-3">
            <div className="m-skeleton w-24" />
            <div className="m-skeleton w-2/3" />
            <div className="m-skeleton w-1/2" />
          </div>
        ) : messages.length === 0 && !draftText && !pending ? (
          <p className="m-muted max-w-lg text-sm leading-relaxed">
            {scopedSources.length
              ? "Ask about the selected sources. Replies stay grounded in those files."
              : "Ask this workspace. The reply is grounded in the sources that have finished processing."}
          </p>
        ) : (
          <ul className="flex w-full flex-col gap-2.5">
            {messages.map((message) => {
              const mine = message.role === "USER";
              return (
                <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <ChatBubble mine={mine} citations={message.citations ?? undefined}>
                    <ChatMarkdown text={message.content} />
                  </ChatBubble>
                </li>
              );
            })}
            {(draftText || pending) && (
              <li className="flex justify-start">
                <ChatBubble mine={false} citations={draftText ? liveCitations : undefined}>
                  {draftText ? (
                    <ChatMarkdown text={draftText} />
                  ) : (
                    <ThinkingStatus hint={statusText} />
                  )}
                </ChatBubble>
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
          toast.success("Chat deleted");
        }}
        onClose={() => setConfirming(false)}
      />

      <form onSubmit={submit} className="m-composer px-4 sm:px-8">
        <div className="m-composer-tools" aria-label="Formatting">
          {FORMAT_TOOLS.map((tool) => (
            <button
              key={tool.kind}
              type="button"
              className="m-composer-tool"
              data-tip={tool.tip}
              data-active={active[tool.kind] || undefined}
              aria-label={tool.tip}
              aria-pressed={active[tool.kind]}
              disabled={pending}
              onMouseDown={onFormatMouseDown}
              onClick={() => applyFormat(tool.kind)}
            >
              {tool.label}
            </button>
          ))}
        </div>
        <div className="m-composer-row">
          <div className="m-composer-field">
            {empty && <span className="m-composer-placeholder">Ask about a source</span>}
            <div
              ref={editorRef}
              className="m-composer-input"
              contentEditable={!pending}
              role="textbox"
              aria-multiline="true"
              aria-label="Message"
              data-placeholder="Ask about a source"
              suppressContentEditableWarning
              onInput={syncEmpty}
              onKeyDown={onComposerKey}
              onBlur={syncEmpty}
              onFocus={() => {
                setActive({
                  bold: queryFormatActive("bold"),
                  italic: queryFormatActive("italic"),
                  code: queryFormatActive("code"),
                  block: queryFormatActive("block"),
                });
              }}
            />
          </div>
          <button type="submit" disabled={pending || empty} className="m-btn m-ask">
            {pending ? "Asking" : "Ask"}
          </button>
        </div>
      </form>
    </div>
  );
}
