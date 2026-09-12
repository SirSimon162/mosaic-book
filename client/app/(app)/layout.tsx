import type { ReactNode } from "react";

import { SessionGate } from "@/components/auth/session-gate";
import { AppChrome } from "@/components/marginals/app-chrome";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome variant="full">
      <SessionGate mode="auth">{children}</SessionGate>
    </AppChrome>
  );
}
