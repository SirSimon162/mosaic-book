import type { ReactNode } from "react";

import { SessionGate } from "@/components/auth/session-gate";
import { AppChrome } from "@/components/marginals/app-chrome";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome variant="home">
      <SessionGate mode="guest">
        <div className="relative flex flex-1 flex-col items-center justify-center py-10 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--sea)_12%,transparent),transparent_65%)]"
          />
          <div className="relative w-full max-w-md">{children}</div>
        </div>
      </SessionGate>
    </AppChrome>
  );
}
