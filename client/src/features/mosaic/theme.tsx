"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import { Icon } from "./icons";

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function nightNow() {
  return document.documentElement.dataset.theme === "night";
}

function writeTheme(night: boolean) {
  if (night) document.documentElement.dataset.theme = "night";
  else delete document.documentElement.dataset.theme;
  localStorage.setItem("mosaic-theme", night ? "night" : "day");
}

export function MosaicTheme() {
  const reduce = useReducedMotion();
  const night = useSyncExternalStore(subscribe, nightNow, () => false);

  return (
    <motion.button
      type="button"
      aria-label={night ? "Switch to day" : "Switch to night"}
      onClick={() => writeTheme(!night)}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      className="m-icon-btn"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={night ? "night" : "day"}
          initial={reduce ? false : { opacity: 0, y: night ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: night ? -4 : 4 }}
          transition={{ duration: 0.16 }}
          className="grid place-items-center"
        >
          <Icon name={night ? "moon" : "sun"} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
