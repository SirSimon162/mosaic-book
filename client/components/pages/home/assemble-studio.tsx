"use client";

import { IconArrowRight, IconSparkles, IconX } from "@tabler/icons-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

import { MosaicMark } from "@/components/brand/logo";
import { Reveal } from "@/components/shared/reveal";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ARTIFACT_TYPES } from "@/lib/artifacts";
import { EASE_OUT, SPRING } from "@/lib/motion";
import { SOURCE_TYPES, type SourceType } from "@/lib/sources";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  "Which sources disagree on the cost of passive cooling?",
  "What changed between the 2016 pilot and the 2019 model?",
  "Summarise the main recommendation in two sentences.",
];

export function AssembleStudio() {
  const reduce = useReducedMotion();
  const [seated, setSeated] = useState<string[]>([]);
  const [question, setQuestion] = useState(0);
  const [asked, setAsked] = useState(false);
  const [forged, setForged] = useState<string | null>(null);

  const inTray = SOURCE_TYPES.filter((source) => !seated.includes(source.id));
  const board = seated
    .map((id) => SOURCE_TYPES.find((source) => source.id === id))
    .filter((source): source is SourceType => Boolean(source));

  const seat = (id: string) => {
    if (seated.length >= 5 || seated.includes(id)) return;
    setSeated((current) => [...current, id]);
    setAsked(false);
    setForged(null);
  };

  const unseat = (id: string) => {
    setSeated((current) => current.filter((item) => item !== id));
    setAsked(false);
    setForged(null);
  };

  return (
    <section id="studio" className="page-shell pt-8 pb-20 sm:py-28">
      <Reveal>
        <p className="text-sm font-medium text-sea">Try it</p>
        <h2 className="mt-3 max-w-2xl font-heading text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-5xl">
          Add a source. Ask a question. Make something.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Click a source to add it. After two sources, ask a question. Then pick
          a quiz, report, flow chart, or timeline.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <LayoutGroup>
          <div className="mt-10 border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <MosaicMark className="size-4 shrink-0 text-sea" />
                <p className="truncate text-sm font-medium">Urban heat project</p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {seated.length} sources
              </p>
            </div>

            <div className="border-b p-4 sm:p-5">
              <p className="text-[0.68rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Sources to add
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AnimatePresence initial={false}>
                  {inTray.map((source) => (
                    <motion.button
                      key={source.id}
                      layoutId={reduce ? undefined : `tile-${source.id}`}
                      type="button"
                      onClick={() => seat(source.id)}
                      transition={reduce ? { duration: 0 } : SPRING}
                      className="inline-flex items-center gap-2 border bg-background px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]"
                    >
                      <source.icon className="size-4 text-sea" />
                      <span className="text-sm font-medium">{source.label}</span>
                    </motion.button>
                  ))}
                </AnimatePresence>
                {inTray.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    All sources added. Remove one from the board to swap.
                  </p>
                )}
              </div>
            </div>

            <div className="border-b p-4 sm:p-5">
              <p className="text-[0.68rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Your board
              </p>
              {board.length === 0 ? (
                <p className="mt-3 border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No sources yet. Pick one above to start.
                </p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {board.map((source) => (
                      <motion.button
                        key={source.id}
                        layoutId={reduce ? undefined : `tile-${source.id}`}
                        type="button"
                        onClick={() => unseat(source.id)}
                        transition={reduce ? { duration: 0 } : SPRING}
                        className="flex items-start justify-between gap-3 border bg-background p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]"
                      >
                        <span className="flex min-w-0 items-start gap-3">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center border border-sea/30 bg-sea/10 text-sea">
                            <source.icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {source.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[0.7rem] text-muted-foreground">
                              {source.sample}
                            </span>
                          </span>
                        </span>
                        <IconX className="size-3.5 shrink-0 text-muted-foreground" />
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="grid border-b sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 px-4 py-3 sm:px-5">
                <p className="text-[0.68rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {asked ? "Answer" : "Question"}
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={asked ? `a-${question}` : `q-${question}`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="mt-1.5 text-sm leading-6"
                  >
                    {asked
                      ? `From ${seated.length} sources: the 2019 spreadsheet and the lecture disagree on labour cost — the brief does not.`
                      : QUESTIONS[question]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <Tooltip>
                <TooltipTrigger
                  disabled={seated.length < 2}
                  onClick={() => {
                    if (asked) {
                      setQuestion((current) => (current + 1) % QUESTIONS.length);
                      setAsked(false);
                      setForged(null);
                      return;
                    }
                    setAsked(true);
                  }}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-full min-h-14 w-full rounded-none border-0 border-t sm:w-36 sm:border-t-0 sm:border-l",
                    "transition-[transform,background-color,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40",
                  )}
                >
                  {asked ? "New question" : "Ask"}
                  <IconArrowRight className="size-4" />
                </TooltipTrigger>
                <TooltipContent>
                  {seated.length < 2
                    ? "Add two sources first"
                    : asked
                      ? "Ask something else"
                      : "Ask using your sources"}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-[0.68rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Make
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ARTIFACT_TYPES.map((artifact) => (
                  <Tooltip key={artifact.id}>
                    <TooltipTrigger
                      disabled={!asked}
                      onClick={() => setForged(artifact.id)}
                      className={cn(
                        "flex items-center gap-2 border bg-background px-3 py-2.5 text-left outline-none transition-[transform,background-color,border-color,opacity] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] disabled:opacity-40",
                        forged === artifact.id && "border-sea bg-sea/10",
                      )}
                    >
                      <artifact.icon className="size-4 shrink-0 text-sea" />
                      <span className="text-sm font-medium">{artifact.label}</span>
                    </TooltipTrigger>
                    <TooltipContent>{artifact.line}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconSparkles className="size-3.5 text-sea" />
                {forged
                  ? `${ARTIFACT_TYPES.find((item) => item.id === forged)?.label} ready from your sources.`
                  : asked
                    ? "Pick what to make."
                    : "Ask a question first."}
              </p>
            </div>
          </div>
        </LayoutGroup>
      </Reveal>
    </section>
  );
}
