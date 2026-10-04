"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "@/shared/branding/mark";
import { useSession } from "@/features/auth/session";

export function MyMosaic({ shine = false }: { shine?: boolean }) {
  const reduce = useReducedMotion();
  const { user, ready, enter } = useSession();
  const [mounted, setMounted] = useState(false);
  const loggedIn = ready && user;

  useEffect(() => {
    setMounted(true);
  }, []);

  const className =
    "relative inline-flex h-10 overflow-hidden rounded-lg bg-[var(--color-on-accent)]/40 p-px md:h-12";
  const face = (
    <>
      {shine && mounted && reduce === false && (
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
    </>
  );

  if (loggedIn) {
    return (
      <Link href="/mosaic" className={className}>
        {face}
      </Link>
    );
  }

  return (
    <button type="button" onClick={enter} className={`cursor-pointer ${className}`}>
      {face}
    </button>
  );
}
