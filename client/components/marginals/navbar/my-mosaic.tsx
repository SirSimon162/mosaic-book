"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "@/components/branding/mark";

export function MyMosaic({ shine = false }: { shine?: boolean }) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <Link
      href="/mosaic"
      className="relative inline-flex h-10 overflow-hidden rounded-lg bg-[var(--color-on-accent)]/40 p-px md:h-12"
    >
      {shine && ready && reduce === false && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 250deg, var(--color-on-accent) 310deg, transparent 360deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      )}
      <span className="relative inline-flex h-full items-center gap-2 rounded-[7px] bg-accent px-3.5 text-sm font-medium whitespace-nowrap text-on-accent md:px-4">
        <Mark className="size-5 md:size-6" />
        My Mosaic
      </span>
    </Link>
  );
}
