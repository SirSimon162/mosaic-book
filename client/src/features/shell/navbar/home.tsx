"use client";

import { Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Brand } from "@/shared/branding/brand";
import { GlassMenu } from "./glass-menu";
import { navLinks, scrollToSection, sectionInView } from "./links";
import { MyMosaic } from "./my-mosaic";
import { ThemeIcon } from "./theme-switch";

const block =
  "border border-primary bg-secondary text-primary shadow-lift";

const ease = [0.22, 1, 0.36, 1] as const;
const splitGap = 12;

function MenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="home-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-lg text-primary hover:bg-[var(--color-primary)]/5 md:size-12"
    >
      {open ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
  );
}

export function HomeNavbar() {
  const reduce = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const allowMotion = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [span, setSpan] = useState(0);
  const [collapsed, setCollapsed] = useState(0);
  const [tools, setTools] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector("[data-hero]");
      const limit = hero instanceof HTMLElement ? hero.offsetHeight : window.innerHeight;
      const past = window.scrollY >= limit - 8;
      setCompact(past);
      setActive(sectionInView());
      if (!past && !window.matchMedia("(max-width: 767px)").matches) setOpen(false);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const bar = barRef.current;
    const button = buttonRef.current;
    const toolsEl = toolsRef.current;
    if (!row || !bar || !button || !toolsEl) return;

    const measure = () => {
      const style = getComputedStyle(bar);
      const extra =
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) +
        parseFloat(style.borderRightWidth);
      setCollapsed(Math.ceil(button.offsetWidth + extra) + 2);
      setTools(toolsEl.offsetWidth);
      setSpan(row.clientWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(button);
    observer.observe(toolsEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((value) => !value);
  }

  function select(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    setOpen(false);
    scrollToSection(id);
  }

  const ready = span > 0 && collapsed > 0;

  useEffect(() => {
    if (ready) allowMotion.current = true;
  }, [ready]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div ref={shellRef}>
        <div className="flex items-center gap-2 px-4 pt-4 sm:gap-4 sm:px-10 lg:px-16">
          <Link
            href="/"
            className={`pointer-events-auto flex h-14 shrink-0 items-center rounded-xl px-4 md:h-16 md:px-5 ${block}`}
          >
            <Brand className="h-7 md:h-8" />
          </Link>

          <div className="pointer-events-auto ml-auto flex items-center gap-2 md:hidden">
            <div className={`flex h-14 items-center rounded-xl p-1.5 ${block}`}>
              <MyMosaic shine />
            </div>
            <div className={`flex h-14 items-center rounded-xl px-1 ${block}`}>
              <ThemeIcon />
              <MenuButton open={open} onClick={toggle} />
            </div>
          </div>

          <div ref={rowRef} className="relative hidden h-16 min-w-0 flex-1 md:block">
            <motion.div
              ref={barRef}
              className={`pointer-events-auto absolute inset-y-0 right-0 flex items-center overflow-hidden rounded-xl p-1.5 ${block}`}
              initial={false}
              animate={
                ready
                  ? {
                      width: compact ? collapsed : span,
                      right: compact ? tools + splitGap : 0,
                    }
                  : { width: "100%", right: 0 }
              }
              transition={{ duration: reduce || !allowMotion.current ? 0 : 0.48, ease }}
            >
              <motion.nav
                className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
                animate={{ opacity: compact ? 0 : 1 }}
                transition={{ duration: reduce ? 0 : 0.35 }}
                inert={compact}
              >
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const selected = active === link.id;

                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      aria-current={selected ? "true" : undefined}
                      onClick={(event) => select(event, link.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                        selected ? "bg-tertiary text-primary" : "text-secondary hover:bg-[var(--color-primary)]/5 hover:text-primary"
                      }`}
                    >
                      <Icon
                        className={`size-4 ${selected ? "text-accent" : ""}`}
                        strokeWidth={1.75}
                      />
                      {link.label}
                    </Link>
                  );
                })}
              </motion.nav>
              <div className="flex shrink-0 items-center gap-2">
                {!compact && <ThemeIcon />}
                <div ref={buttonRef}>
                  <MyMosaic shine />
                </div>
              </div>
            </motion.div>
            <motion.div
              className={`absolute inset-y-0 right-0 z-10 overflow-hidden ${
                compact ? "pointer-events-auto" : "pointer-events-none"
              }`}
              initial={false}
              animate={{ width: compact ? tools : 0, opacity: compact ? 1 : 0 }}
              transition={{ duration: reduce || !allowMotion.current ? 0 : 0.48, ease }}
              inert={!compact}
              aria-hidden={!compact}
            >
              <div
                ref={toolsRef}
                className={`flex h-full w-max items-center gap-0.5 rounded-xl px-1.5 ${block}`}
              >
                <ThemeIcon />
                <MenuButton open={open} onClick={toggle} />
              </div>
            </motion.div>
          </div>
        </div>

        <GlassMenu open={open} active={active} onSelect={select} />
      </div>
    </header>
  );
}
