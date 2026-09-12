"use client";

import {
  IconChevronDown,
  IconLoader2,
  IconLogout,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MosaicLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/marginals/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-cleint";
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
        <NavAuthLinks />
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

function NavAuthLinks() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return (
      <div className="flex h-9 w-[7.25rem] items-center justify-end" aria-busy="true">
        <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking session</span>
      </div>
    );
  }

  if (data?.user) {
    async function onSignOut() {
      setSigningOut(true);
      const result = await signOut();
      if (result.error) {
        setSigningOut(false);
        return;
      }
      router.replace(routes.home);
      router.refresh();
    }

    return (
      <div className="inline-flex h-9 overflow-hidden rounded-lg bg-sea">
        <Link
          href={routes.dashboard}
          className={cn(
            "inline-flex items-center px-2.5 text-sm font-semibold text-sea-foreground sm:px-3.5",
            "outline-none transition-colors duration-150 ease-out",
            "hover:bg-sea-foreground/10 focus-visible:bg-sea-foreground/10",
          )}
        >
          Dashboard
        </Link>
        <span aria-hidden="true" className="w-px self-stretch bg-sea-foreground/20" />
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={signingOut}
            aria-label="Account menu"
            className={cn(
              "group grid w-8 place-items-center text-sea-foreground outline-none sm:w-9",
              "transition-colors duration-150 ease-out",
              "hover:bg-sea-foreground/10 focus-visible:bg-sea-foreground/10",
              "data-popup-open:bg-sea-foreground/10",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <IconChevronDown className="size-3.5 transition-transform duration-150 ease-out group-data-popup-open:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={signingOut}
              onClick={() => {
                void onSignOut();
              }}
            >
              {signingOut ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconLogout />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
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
  );
}
