"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/shared/branding/brand";
import { navLinks } from "./links";
import { MyMosaic } from "./my-mosaic";
import { ThemeIcon } from "./theme-switch";

export function SimpleNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-primary bg-[var(--bg-primary)]/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:h-16 sm:px-10 lg:px-16">
        <Link href="/" className="inline-flex items-center">
          <Brand className="h-7 md:h-8" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.id}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-secondary hover:bg-[var(--color-primary)]/5 hover:text-primary"
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeIcon />
          <MyMosaic />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-primary md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-primary bg-primary px-6 py-4 md:hidden">
          <nav className="flex flex-col">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm text-primary"
                >
                  <Icon className="size-4 text-accent" strokeWidth={1.75} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
