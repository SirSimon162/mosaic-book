"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type Theme = "day" | "night";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "night" ? "night" : "day";
}

function writeTheme(theme: Theme) {
  if (theme === "night") document.documentElement.dataset.theme = "night";
  else delete document.documentElement.dataset.theme;
  localStorage.setItem("mosaic-theme", theme);
}

export function ThemeIcon() {
  const reduce = useReducedMotion();
  const [theme, setTheme] = useState<Theme>("day");
  const night = theme === "night";
  const Icon = night ? Moon : Sun;

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next = night ? "day" : "night";
    writeTheme(next);
    setTheme(next);
  }

  return (
    <motion.button
      type="button"
      aria-label={night ? "Switch to day" : "Switch to night"}
      onClick={toggle}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg text-primary hover:bg-[var(--color-primary)]/5 md:size-12"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={reduce ? false : { rotate: night ? 50 : -50, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={reduce ? undefined : { rotate: night ? -50 : 50, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="grid place-items-center"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
