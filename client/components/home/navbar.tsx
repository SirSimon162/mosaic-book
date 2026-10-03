"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "./mark";

const links = [
  { href: "#path", id: "path", label: "Path" },
  { href: "#workspace", id: "workspace", label: "Workspace" },
  { href: "#learn", id: "learn", label: "Learn" },
];

type Theme = "paper" | "night";

function ThemeSwitch({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div className="flex rounded-md border border-rule p-0.5 font-mono text-[11px]">
      {(["paper", "night"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => onChange(option)}
          className={`rounded px-2 py-1 capitalize ${
            theme === option ? "bg-ink text-paper" : "text-mute"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const [theme, setTheme] = useState<Theme>("paper");
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "night" ? "night" : "paper",
    );
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = links
      .map((link) => document.getElementById(link.id))
      .filter((node): node is HTMLElement => node !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0.15, 0.4] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function chooseTheme(next: Theme) {
    if (next === "night") {
      document.documentElement.dataset.theme = "night";
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem("mosaic-theme", next);
    setTheme(next);
  }

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-paper ${
        scrolled ? "border-rule" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-6">
        <Link href="/" className="inline-flex items-center gap-2 font-medium">
          <Mark />
          Mosaic
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`text-sm ${
                active === link.id
                  ? "text-ink underline decoration-ink decoration-1 underline-offset-[6px]"
                  : "text-mute"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeSwitch theme={theme} onChange={chooseTheme} />
          </div>
          <Link href="/login" className="hidden text-sm text-ink sm:inline">
            Log in
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper"
          >
            Sign up
          </Link>
          <button
            type="button"
            className="text-sm text-ink md:hidden"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-rule px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="text-sm text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link href="/login" className="text-sm text-ink">
              Log in
            </Link>
          </nav>
          <div className="mt-4 sm:hidden">
            <ThemeSwitch theme={theme} onChange={chooseTheme} />
          </div>
        </div>
      )}
    </header>
  );
}
