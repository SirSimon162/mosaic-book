"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useSession } from "./session";

type Mode = "login" | "register";

export function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const { login, register } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, pending]);

  useEffect(() => {
    if (open) return;
    setMode("login");
    setError("");
    setPending(false);
  }, [open]);

  if (!open) return null;

  function choose(next: Mode) {
    setMode(next);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();

    setPending(true);
    setError("");
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({
          email,
          password,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
        });
      }
      onSuccess?.();
      router.push("/mosaic");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setPending(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[var(--bg-inverse)]/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-primary bg-secondary p-6 text-primary shadow-menu"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-tertiary text-[11px] tracking-[0.16em] text-secondary">ACCOUNT</p>
            <h2 id={titleId} className="mt-2 font-secondary text-3xl tracking-tight">
              {mode === "login" ? "Log in" : "Create an account"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={pending}
            className="grid size-9 place-items-center rounded-lg text-secondary hover:bg-primary hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-lg bg-primary p-1">
          <button
            type="button"
            onClick={() => choose("login")}
            className={`rounded-md px-3 py-2 text-sm ${
              mode === "login" ? "bg-secondary text-primary shadow-lift" : "text-secondary"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => choose("register")}
            className={`rounded-md px-3 py-2 text-sm ${
              mode === "register" ? "bg-secondary text-primary shadow-lift" : "text-secondary"
            }`}
          >
            Create account
          </button>
        </div>

        <form key={mode} onSubmit={submit} className="mt-5 space-y-4">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-secondary">First name</span>
                <input
                  name="firstName"
                  autoComplete="given-name"
                  className="mt-1 w-full rounded-lg border border-primary bg-primary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
                />
              </label>
              <label className="block text-sm">
                <span className="text-secondary">Last name</span>
                <input
                  name="lastName"
                  autoComplete="family-name"
                  className="mt-1 w-full rounded-lg border border-primary bg-primary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
                />
              </label>
            </div>
          )}
          <label className="block text-sm">
            <span className="text-secondary">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-primary bg-primary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="text-secondary">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg border border-primary bg-primary px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          {error && <p className="text-sm text-primary">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[9px] bg-accent px-4 py-[11px] text-sm text-on-accent transition-colors duration-200 hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {pending ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
