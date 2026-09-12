"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/auth-cleint";
import { routes } from "@/lib/routes";

type SessionGateProps = {
  children: ReactNode;
  mode: "guest" | "auth";
};

function GateFallback() {
  return (
    <div
      className="flex flex-1 items-center justify-center py-24"
      aria-busy="true"
      aria-live="polite"
    >
      <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Checking session</span>
    </div>
  );
}

export function SessionGate({ children, mode }: SessionGateProps) {
  const router = useRouter();
  const { data, isPending } = useSession();
  const isAuthenticated = !!data?.user;

  useEffect(() => {
    if (isPending) return;
    if (mode === "guest" && isAuthenticated) {
      router.replace(routes.dashboard);
      return;
    }
    if (mode === "auth" && !isAuthenticated) {
      router.replace(routes.login);
    }
  }, [isAuthenticated, isPending, mode, router]);

  if (isPending) return <GateFallback />;
  if (mode === "guest" && isAuthenticated) return <GateFallback />;
  if (mode === "auth" && !isAuthenticated) return <GateFallback />;

  return children;
}
