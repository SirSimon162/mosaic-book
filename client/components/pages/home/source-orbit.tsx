"use client";

import { IconBrain } from "@tabler/icons-react";
import { useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

import { ORBIT_RINGS, type SourceType } from "@/lib/sources";
import { cn } from "@/lib/utils";

export function SourceOrbit() {
  const reduce = useReducedMotion();

  return (
    <div className="orbit-stage w-full max-w-none sm:mx-auto sm:max-w-[22.9rem] lg:max-w-[24.6rem]">
      <div className="orbit-stage-inner">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--sea)_24%,transparent)_0%,color-mix(in_oklch,var(--sea)_6%,transparent)_45%,transparent_70%)]"
        />

        {ORBIT_RINGS.map((ring, ringIndex) => (
          <OrbitRing
            key={ring.id}
            sources={ring.sources}
            radius={ring.radius}
            duration={ring.duration}
            reduce={Boolean(reduce)}
            ringIndex={ringIndex}
          />
        ))}

        <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="hub-core relative flex size-[4.5rem] flex-col items-center justify-center gap-1 rounded-full border border-sea/35 bg-card text-sea sm:size-[5rem]">
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-[-10px] rounded-full border border-dashed border-sea/25",
                !reduce && "orbit-spin",
              )}
              style={{ "--orbit-duration": "12s" } as CSSProperties}
            />
            <IconBrain className="size-6 sm:size-7" />
            <span className="font-heading text-[0.62rem] font-semibold tracking-tight text-foreground">
              Mosaic
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrbitRing({
  sources,
  radius,
  duration,
  reduce,
  ringIndex,
}: {
  sources: readonly SourceType[];
  radius: string;
  duration: string;
  reduce: boolean;
  ringIndex: number;
}) {
  return (
    <div
      className={cn("absolute inset-0", !reduce && "orbit-spin")}
      style={{ "--orbit-duration": duration } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 rounded-full border border-sea/18"
        style={{
          width: `calc(${radius} * 2)`,
          height: `calc(${radius} * 2)`,
          transform: "translate(-50%, -50%)",
        }}
      />

      {sources.map((source, index) => {
        const angle = (360 / sources.length) * index + ringIndex * 28;

        return (
          <div
            key={source.id}
            className="absolute top-1/2 left-1/2 h-0"
            style={{
              width: radius,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "left center",
            }}
          >
            <div
              className="absolute top-0 left-full"
              style={{
                transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
              }}
            >
              <div
                className={cn(!reduce && "orbit-counter")}
                style={{ "--orbit-duration": duration } as CSSProperties}
              >
                <OrbitPill source={source} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrbitPill({ source }: { source: SourceType }) {
  const Icon = source.icon;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 py-1.5 text-foreground shadow-sm dark:border-white/12">
      <Icon className="size-3.5 shrink-0 text-sea" />
      <span className="text-[0.7rem] font-medium whitespace-nowrap">
        {source.label}
      </span>
    </div>
  );
}
