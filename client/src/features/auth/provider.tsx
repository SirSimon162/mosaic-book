"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MOSAIC, type RegisterBody, type SessionUser } from "@/services/mosaic";
import { AuthModal } from "./modal";
import { SessionContext } from "./session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const queued = useRef(false);

  useEffect(() => {
    let active = true;
    MOSAIC.me().then((next) => {
      if (!active) return;
      setUser(next);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const enter = useCallback(() => {
    if (!ready) {
      queued.current = true;
      return;
    }
    if (user) {
      router.push("/mosaic");
      return;
    }
    setOpen(true);
  }, [ready, router, user]);

  useEffect(() => {
    if (!ready || !queued.current) return;
    queued.current = false;
    if (user) router.push("/mosaic");
    else setOpen(true);
  }, [ready, router, user]);

  async function login(input: { email: string; password: string }) {
    setUser(await MOSAIC.login(input));
  }

  async function register(input: RegisterBody) {
    setUser(await MOSAIC.register(input));
  }

  return (
    <SessionContext.Provider value={{ user, ready, enter, login, register }}>
      {children}
      <AuthModal open={open} onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} />
    </SessionContext.Provider>
  );
}
