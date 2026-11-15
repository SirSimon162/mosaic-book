"use client";

import { useEffect, useState, type ReactNode } from "react";
import { stackSection } from "./section";

const stations = [
  { number: "01", title: "Source" },
  { number: "02", title: "Place" },
  { number: "03", title: "Answer" },
];

function SourceCard() {
  return (
    <>
      <p className="font-tertiary text-xs leading-relaxed text-primary">results.xlsx</p>
      <span className="mt-3 inline-block rounded-full bg-tertiary px-2 py-0.5 font-tertiary text-[11px] text-accent">
        Sheet 2 · B12:B48
      </span>
    </>
  );
}

function PlaceCard() {
  return (
    <p className="text-sm leading-relaxed text-primary">
      Treated rows average{" "}
      <span className="underline decoration-accent decoration-2 underline-offset-[3px]">
        18.6
      </span>
      , against 17.2 in the control block.
    </p>
  );
}

function AnswerCard() {
  return (
    <p className="text-sm leading-relaxed text-primary">
      In this sheet the treatment sits with a higher mean. The lecture treats
      that gap as descriptive, not a model.{" "}
      <span className="font-medium text-accent">[1]</span>
    </p>
  );
}

const cards = [SourceCard, PlaceCard, AnswerCard];

function useStationCycle(count: number, paused: boolean) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [count, paused]);

  return [active, setActive] as const;
}

function Station({
  number,
  title,
  active,
  onSelect,
  children,
}: {
  number: string;
  title: string;
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <article className="text-left" onMouseEnter={onSelect} onFocus={onSelect}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={`relative z-10 font-tertiary text-[11px] ${active ? "text-accent" : "text-secondary"}`}
      >
        <span className="bg-primary pr-3">{number}</span>
      </button>
      <h3 className="mt-4 font-secondary text-2xl text-primary">{title}</h3>
      <div
        className={`mt-4 rounded-2xl border bg-secondary p-4 transition ${
          active
            ? "border-accent shadow-accent"
            : "border-primary"
        }`}
      >
        {children}
      </div>
    </article>
  );
}

export function Path() {
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useStationCycle(stations.length, paused);

  return (
    <section
      className={`${stackSection} bg-primary`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        data-sheet
        className="flex h-full w-full flex-col justify-center px-6 pt-24 sm:px-10 lg:px-16"
      >
        <p className="font-tertiary text-[11px] tracking-[0.18em] text-secondary">
          HOW AN ANSWER IS MADE
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl tracking-tight text-balance text-primary sm:text-6xl">
          A question crosses three places.
        </h2>

        <div className="relative mt-10">
          <div className="absolute top-[18px] right-0 left-0 hidden h-px bg-[var(--border-primary)] md:block" />
          <div
            className="absolute top-[18px] left-0 hidden h-px bg-accent transition-all duration-500 md:block"
            style={{ width: `${((active + 1) / stations.length) * 100}%` }}
          />
          <div className="grid gap-6 md:grid-cols-3">
            {stations.map((station, index) => {
              const Card = cards[index];
              return (
                <Station
                  key={station.title}
                  number={station.number}
                  title={station.title}
                  active={index === active}
                  onSelect={() => setActive(index)}
                >
                  <Card />
                </Station>
              );
            })}
          </div>
        </div>

        <p className="mt-8 font-tertiary text-xs text-secondary">
          The citation is the point. Hover a station, or let it play.
        </p>
      </div>
    </section>
  );
}
