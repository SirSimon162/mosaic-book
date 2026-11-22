"use client";

import type { ReactNode } from "react";
import { AuthModal } from "@/features/auth/modal";
import { useSession } from "@/features/auth/session";

export function MosaicGate({ children }: { children: ReactNode }) {
  const { user, ready, leaving } = useSession();

  if (!ready || leaving) {
    return <div className="h-full" />;
  }

  if (!user) {
    return (
      <div className="h-full">
        <AuthModal open required />
      </div>
    );
  }

  return children;
}
