"use client";

import Link from "next/link";

import { MosaicLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/marginals/theme-toggle";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NavbarProps = {
  /** Constrain to the home 1000px + gutter frame */
  framed?: boolean;
};

export function Navbar({ framed = false }: NavbarProps) {
  const nav = (
    <nav
      className={cn(
        "pointer-events-auto flex items-center justify-between gap-2 sm:gap-3",
        framed
          ? "navbar-slot"
          : "mx-auto w-full px-4 pt-3 pb-2 sm:px-6",
      )}
    >
      <Link
        href={routes.home}
        aria-label="Mosaic home"
        className={cn(
          "nav-chip inline-flex shrink-0 items-center rounded-lg px-2.5 py-2 outline-none sm:px-3",
          "transition-[transform,background-color,border-color] duration-150 ease-out",
          "focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
        )}
      >
        <MosaicLogo />
      </Link>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="nav-chip flex items-center rounded-lg p-1">
          <ThemeToggle />
        </div>
        <Link
          href={routes.login}
          className={cn(
            "hidden h-9 items-center rounded-lg px-2.5 text-sm font-medium text-muted-foreground sm:inline-flex",
            "outline-none transition-[transform,color] duration-150 ease-out",
            "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
          )}
        >
          Sign in
        </Link>
        <Link
          href={routes.signup}
          className={cn(
            "inline-flex h-9 items-center rounded-lg border border-transparent bg-sea px-2.5 text-sm font-semibold text-sea-foreground sm:px-3.5",
            "outline-none transition-[transform,background-color] duration-150 ease-out",
            "hover:bg-sea/90 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
          )}
        >
          Get started
        </Link>
      </div>
    </nav>
  );

  return (
    <header className="navbar">
      {framed ? (
        <div className="home-frame navbar-frame">
          <div aria-hidden="true" />
          {nav}
          <div aria-hidden="true" />
        </div>
      ) : (
        nav
      )}
    </header>
  );
}
