"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AuthModal } from "@/features/auth/modal";
import { useSession } from "@/features/auth/session";

export function MosaicGate({ children }: { children: ReactNode }) {
  const { user, ready, leaving } = useSession();
  const router = useRouter();

  if (!ready || leaving) {
    return <div className="h-full bg-primary" />;
  }

  if (!user) {
    return (
      <div className="h-full bg-primary">
        <AuthModal open onClose={() => router.push("/")} />
      </div>
    );
  }

  return children;
}
