"use client";

import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

import { SourceOrbit } from "@/components/pages/home/source-orbit";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="overflow-x-clip pb-6 sm:overflow-visible sm:pb-16 lg:pb-24">
      <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6">
        <div className="min-w-0">
          <p className="rise text-xs font-medium tracking-[0.18em] text-sea uppercase">
            Research workspace
          </p>
          <h1
            className="rise mt-4 max-w-xl font-heading text-4xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Your sources, one place to ask.
          </h1>
          <p
            className="rise mt-5 max-w-md text-[16px] leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8"
            style={{ animationDelay: "120ms" }}
          >
            Drop in YouTube, notes, websites, PDFs, and spreadsheets. Mosaic
            answers from what you added — then helps you turn findings into
            quizzes, reports, and charts.
          </p>
          <div className="rise mt-8" style={{ animationDelay: "180ms" }}>
            <Link
              href={routes.signup}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 gap-2 bg-sea px-5 text-[0.95rem] text-sea-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-sea/90 active:scale-[0.97]",
              )}
            >
              Get started
              <IconArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div
          className="rise w-full min-w-0 overflow-x-clip sm:overflow-visible"
          style={{ animationDelay: "160ms" }}
        >
          <SourceOrbit />
        </div>
      </div>
    </section>
  );
}
