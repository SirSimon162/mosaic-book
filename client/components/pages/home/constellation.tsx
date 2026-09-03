"use client";

import { Reveal } from "@/components/shared/reveal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SOURCE_TYPES } from "@/lib/sources";

export function Constellation() {
  return (
    <section className="border-y py-20 sm:py-28">
      <div className="page-shell">
        <Reveal>
          <p className="text-sm font-medium text-sea">Sources</p>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-5xl">
            Notes, links, videos, docs, and sheets.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SOURCE_TYPES.map((source, index) => (
            <Reveal key={source.id} delay={index * 50}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href="#studio"
                      className="flex h-full flex-col items-start gap-4 rounded-2xl border bg-card p-4 text-left outline-none transition-[transform,background-color,border-color] duration-150 ease-out hover:border-sea/40 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]"
                    />
                  }
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-xl border border-sea/30 bg-sea/10 text-sea">
                    <source.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-base font-semibold tracking-tight">
                      {source.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {source.description}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{source.sample}</TooltipContent>
              </Tooltip>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
