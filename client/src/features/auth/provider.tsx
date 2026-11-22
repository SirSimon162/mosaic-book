"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MOSAIC, type RegisterBody, type SessionUser } from "@/services/mosaic";
import { SessionContext } from "./session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    MOSAIC.me()
      .then((next) => {
        if (!active) return;
        setUser(next);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(input: { email: string; password: string }) {
    setUser(await MOSAIC.login(input));
  }

  async function register(input: RegisterBody) {
    setUser(await MOSAIC.register(input));
  }

  async function logout() {
    setLeaving(true);
    try {
      await MOSAIC.logout();
      setUser(null);
      router.replace("/mosaic");
    } catch (cause) {
      setLeaving(false);
      throw cause;
    }
  }

  return (
    <SessionContext.Provider value={{ user, ready, leaving, login, register, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
