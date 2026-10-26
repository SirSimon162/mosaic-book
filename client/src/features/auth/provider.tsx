"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { MOSAIC, type RegisterBody, type SessionUser } from "@/services/mosaic";
import { AuthModal } from "./modal";
import { SessionContext } from "./session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [queued, setQueued] = useState(false);
  const onMosaic = pathname === "/mosaic" || pathname.startsWith("/mosaic/");
  if (leaving && !onMosaic) setLeaving(false);
  if (ready && queued && !user) {
    setQueued(false);
    setOpen(true);
  }
  if (onMosaic && queued) setQueued(false);

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

  const enter = useCallback(() => {
    if (!ready) {
      setQueued(true);
      return;
    }
    if (user) {
      router.push("/mosaic");
      return;
    }
    setOpen(true);
  }, [ready, router, user]);

  useEffect(() => {
    if (!ready || !queued || !user) return;
    router.push("/mosaic");
  }, [ready, queued, router, user]);

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
      router.replace("/");
    } catch (cause) {
      setLeaving(false);
      throw cause;
    }
  }

  return (
    <SessionContext.Provider value={{ user, ready, leaving, enter, login, register, logout }}>
      {children}
      <AuthModal open={open} onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} />
    </SessionContext.Provider>
  );
}
