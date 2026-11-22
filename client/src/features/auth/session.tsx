"use client";

import { createContext, useContext } from "react";
import type { RegisterBody, SessionUser } from "@/services/mosaic";

export type SessionContextValue = {
  user: SessionUser | null;
  ready: boolean;
  leaving: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("Session is unavailable");
  }
  return value;
}
