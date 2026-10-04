"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "./session";

export function EnterLink({ className, children }: { className?: string; children: ReactNode }) {
  const { user, ready, enter } = useSession();

  if (ready && user) {
    return (
      <Link href="/mosaic" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={enter} className={`cursor-pointer ${className ?? ""}`}>
      {children}
    </button>
  );
}
