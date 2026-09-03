"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Reveal } from "@/components/shared/reveal";
import { ARTIFACT_TYPES } from "@/lib/artifacts";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PREVIEWS: Record<string, ReactNode> = {
  quiz: <QuizPreview />,
  report: <ReportPreview />,
  flow: <FlowPreview />,
  timeline: <TimelinePreview />,
};

export function ArtifactSwitcher() {
  const [active, setActive] = useState(ARTIFACT_TYPES[0]!.id);
  const reduce = useReducedMotion();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const current =
    ARTIFACT_TYPES.find((item) => item.id === active) ?? ARTIFACT_TYPES[0]!;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = ARTIFACT_TYPES.findIndex((item) => item.id === active);
    let next = index;

    if (event.key === "ArrowRight") next = (index + 1) % ARTIFACT_TYPES.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + ARTIFACT_TYPES.length) % ARTIFACT_TYPES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ARTIFACT_TYPES.length - 1;
    else return;

    event.preventDefault();
    const target = ARTIFACT_TYPES[next]!;
    setActive(target.id);
    tabRefs.current[target.id]?.focus();
  };

  return (
    <section id="artifacts" className="page-shell py-20 sm:py-28">
      <Reveal>
        <p className="text-sm font-medium text-sea">Artifacts</p>
        <h2 className="mt-3 max-w-2xl font-heading text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">
          Answers are the start, not the deliverable.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Once a mosaic can answer questions, it can also produce the thing you
          actually needed. Pick an artifact and it gets built from the same
          cited tiles.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <div className="mt-10 rounded-[1.25rem] border bg-card p-2">
          <div
            role="tablist"
            aria-label="Artifact types"
            onKeyDown={onKeyDown}
            className="grid grid-cols-2 gap-1 sm:grid-cols-4"
          >
            {ARTIFACT_TYPES.map((item) => {
              const selected = item.id === active;

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    tabRefs.current[item.id] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`artifact-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`artifact-panel-${item.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(item.id)}
                  className="relative rounded-xl px-3 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {selected && (
                    <motion.span
                      layoutId="artifact-pill"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl border bg-background shadow-sm"
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: "spring", bounce: 0, duration: 0.4 }
                      }
                    />
                  )}

                  <span
                    className={cn(
                      "relative z-10 inline-flex items-center justify-center gap-2 text-sm transition-colors duration-150 ease-out",
                      selected
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn("size-4", selected && "text-sea")}
                    />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 min-h-[19rem] rounded-xl border bg-background/60 p-6 sm:p-8">
            <motion.div
              key={current.id}
              id={`artifact-panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`artifact-tab-${current.id}`}
              tabIndex={0}
              initial={
                reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }
              }
              animate={
                reduce ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }
              }
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="grid gap-8 outline-none sm:grid-cols-2 sm:items-center"
            >
              <div>
                <h3 className="font-heading text-xl font-semibold tracking-tight">
                  {current.headline}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {current.body}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-5">
                {PREVIEWS[current.id]}
              </div>
            </motion.div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function QuizPreview() {
  const options = [
    "Retrofit labour cost",
    "Roof albedo and shading",
    "Grid peak pricing",
  ];

  return (
    <div>
      <p className="text-xs leading-5 text-muted-foreground">
        Which factor dominated the 2019 cost model?
      </p>
      <div className="mt-3 space-y-1.5">
        {options.map((option, index) => (
          <div
            key={option}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs",
              index === 1
                ? "border-sea/35 bg-sea/10 text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-3 shrink-0 rounded-[3px] border",
                index === 1 && "border-sea bg-sea",
              )}
            />
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPreview() {
  return (
    <div className="space-y-4">
      <div className="h-2.5 w-2/5 rounded-full bg-foreground/25" />
      <div className="space-y-2">
        {[100, 94, 98, 62].map((width, index) => (
          <div
            key={index}
            className="h-1.5 rounded-full bg-muted-foreground/25"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {["Tile 2", "Tile 4", "Tile 5"].map((tile) => (
          <span
            key={tile}
            className="rounded-md border border-sea/25 bg-sea/10 px-1.5 py-0.5 text-[0.65rem] text-sea"
          >
            {tile}
          </span>
        ))}
      </div>
    </div>
  );
}

function FlowPreview() {
  return (
    <svg viewBox="0 0 240 112" className="w-full" aria-hidden="true">
      <g className="stroke-border" strokeWidth="1.5" fill="none">
        <path d="M74 26 H90" />
        <path d="M156 26 H172" />
        <path d="M122 42 V70" />
      </g>

      <g strokeWidth="1.25">
        <rect
          x="8"
          y="12"
          width="66"
          height="28"
          rx="7"
          className="fill-card stroke-border"
        />
        <rect
          x="90"
          y="12"
          width="66"
          height="28"
          rx="7"
          className="fill-sea/20 stroke-sea/45"
        />
        <rect
          x="172"
          y="12"
          width="60"
          height="28"
          rx="7"
          className="fill-card stroke-border"
        />
        <rect
          x="90"
          y="70"
          width="66"
          height="28"
          rx="7"
          className="fill-card stroke-border"
          strokeDasharray="3 3"
        />
      </g>

      <g className="fill-muted-foreground" fontSize="8.5">
        <text x="41" y="30" textAnchor="middle">
          Intake
        </text>
        <text x="123" y="30" textAnchor="middle" className="fill-sea">
          Review
        </text>
        <text x="202" y="30" textAnchor="middle">
          Approve
        </text>
        <text x="123" y="88" textAnchor="middle">
          Escalate
        </text>
      </g>
    </svg>
  );
}

function TimelinePreview() {
  const events = [
    { label: "2016 · Pilot district", note: "Tile 1, p. 4" },
    { label: "2019 · Cost model revised", note: "Tile 4, sheet 2" },
    { label: "2023 · Policy adopted", note: "Tile 2" },
  ];

  return (
    <div className="relative space-y-4 pl-5">
      <span
        aria-hidden="true"
        className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-border"
      />
      {events.map((event, index) => (
        <div key={event.label} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 -left-5 size-[7px] rotate-45 rounded-[1px]",
              index === 0 ? "bg-sea" : "bg-muted-foreground/40",
            )}
          />
          <p className="text-xs font-medium">{event.label}</p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            {event.note}
          </p>
        </div>
      ))}
    </div>
  );
}
