"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { navLinks } from "./links";

export function GlassMenu({
  open,
  active,
  onSelect,
}: {
  open: boolean;
  active: string | null;
  onSelect: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="home-menu"
          role="menu"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto fixed top-[5.25rem] right-4 z-50 w-[min(16rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-primary bg-secondary p-1.5 text-primary shadow-menu sm:right-10 md:top-[5.75rem] lg:right-16"
        >
          <nav className="flex flex-col">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const selected = active === link.id;

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  role="menuitem"
                  onClick={(event) => onSelect(event, link.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    selected ? "bg-tertiary text-primary" : "text-secondary hover:bg-primary hover:text-primary"
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
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
