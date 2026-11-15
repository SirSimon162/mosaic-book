"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { FileText, Link2, PenLine } from "lucide-react";

type BookClipType = "writing" | "upload" | "link";

type BookClip = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  type: BookClipType;
  color: string;
  accent: string;
};

/** Soft accent tab palette aligned to Chromatic Noir / Artistic Glass. */
const MOSAIC_UPLOAD_CLIPS: BookClip[] = [
  { id: "pdf", label: "PDF", shortLabel: "PDF", icon: FileText, type: "upload", color: "#D8E0FF", accent: "#526FE5" },
  { id: "link", label: "Link", shortLabel: "Link", icon: Link2, type: "link", color: "#D7F1F4", accent: "#6DBCCB" },
  { id: "note", label: "Note", shortLabel: "Note", icon: PenLine, type: "writing", color: "#E4DEFF", accent: "#B6A4FF" },
];

type PillBox = { left: number; width: number };

export function BookWithClips({
  clips = MOSAIC_UPLOAD_CLIPS,
  activeId,
  defaultActiveId,
  onChange,
  renderPanel,
  className = "",
}: {
  clips?: BookClip[];
  activeId?: string;
  defaultActiveId?: string;
  onChange?: (id: string) => void;
  renderPanel: (clip: BookClip) => ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const listId = useId();
  const [internal, setInternal] = useState(defaultActiveId ?? clips[0]?.id ?? "");
  const active = activeId ?? internal;
  const activeIndex = Math.max(0, clips.findIndex((clip) => clip.id === active));
  const activeClip = clips[activeIndex] ?? clips[0];
  const [direction, setDirection] = useState(1);
  const [pill, setPill] = useState<PillBox>({ left: 0, width: 0 });
  const tablistRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(id: string) {
    const nextIndex = clips.findIndex((clip) => clip.id === id);
    if (nextIndex >= 0 && nextIndex !== activeIndex) {
      setDirection(nextIndex > activeIndex ? 1 : -1);
    }
    if (activeId === undefined) setInternal(id);
    onChange?.(id);
  }

  const measurePill = useCallback(() => {
    const list = tablistRef.current;
    const tab = tabRefs.current[activeIndex];
    if (!list || !tab) return;
    const listBox = list.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    setPill({
      left: tabBox.left - listBox.left,
      width: tabBox.width,
    });
  }, [activeIndex]);

  useLayoutEffect(() => {
    measurePill();
  }, [measurePill, clips.length]);

  useEffect(() => {
    window.addEventListener("resize", measurePill);
    return () => window.removeEventListener("resize", measurePill);
  }, [measurePill]);

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = clips.findIndex((clip) => clip.id === active);
    if (index < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = clips[(index + 1) % clips.length];
      if (!next) return;
      select(next.id);
      tabRefs.current[(index + 1) % clips.length]?.focus();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = (index - 1 + clips.length) % clips.length;
      const prev = clips[prevIndex];
      if (!prev) return;
      select(prev.id);
      tabRefs.current[prevIndex]?.focus();
    }
  }

  if (!activeClip) return null;

  const slide = direction >= 0 ? 28 : -28;

  return (
    <div
      className={`m-book ${className}`.trim()}
      style={
        {
          "--clip-color": activeClip.color,
          "--clip-accent": activeClip.accent,
        } as CSSProperties
      }
    >
      <div
        ref={tablistRef}
        className="m-book-clips"
        role="tablist"
        aria-label="Upload type"
        aria-orientation="horizontal"
        onKeyDown={onTabKey}
      >
        <motion.span
          className="m-book-clip-pill"
          aria-hidden
          initial={false}
          animate={{
            x: pill.left,
            width: Math.max(pill.width, 1),
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 36, mass: 0.8 }
          }
          style={
            {
              opacity: pill.width > 0 ? 1 : 0,
              "--clip-accent": activeClip.accent,
            } as CSSProperties
          }
        />
        {clips.map((clip, index) => {
          const selected = clip.id === activeClip.id;
          const Icon = clip.icon;
          return (
            <motion.button
              key={clip.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${listId}-${clip.id}`}
              aria-selected={selected}
              aria-controls={`${listId}-panel`}
              tabIndex={selected ? 0 : -1}
              className="m-book-clip"
              data-selected={selected || undefined}
              style={
                {
                  "--clip-color": clip.color,
                  "--clip-accent": clip.accent,
                } as CSSProperties
              }
              onClick={() => select(clip.id)}
              whileHover={reduce ? undefined : { y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
            >
              <motion.span
                className="m-book-clip-icon"
                aria-hidden
                animate={selected && !reduce ? { scale: 1.06 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 28 }}
              >
                <Icon size={16} strokeWidth={2.25} />
              </motion.span>
              <span className="m-book-clip-label">
                <span className="m-book-clip-full">{clip.label}</span>
                <span className="m-book-clip-short">{clip.shortLabel ?? clip.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="m-book-body">
        <div
          role="tabpanel"
          id={`${listId}-panel`}
          aria-labelledby={`${listId}-${activeClip.id}`}
          className="m-book-page"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeClip.id}
              className="m-book-page-inner"
              initial={reduce ? false : { opacity: 0, x: slide }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -slide * 0.45 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderPanel(activeClip)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
