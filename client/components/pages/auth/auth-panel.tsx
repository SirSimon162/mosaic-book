"use client";

import {
  IconBrandGoogle,
  IconEye,
  IconEyeOff,
  IconLoader2,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-cleint";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

const COPY: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    submit: string;
    switchPrompt: string;
    switchLabel: string;
    switchHref: string;
  }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to Mosaic",
    subtitle: "Pick up where you left your sources.",
    submit: "Sign in",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    switchHref: routes.signup,
  },
  signup: {
    eyebrow: "Get started",
    title: "Create your workspace",
    subtitle: "Drop in sources and start asking — takes a minute.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: routes.login,
  },
};

function callbackURL() {
  return `${window.location.origin}${routes.dashboard}`;
}

export function AuthPanel({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"credentials" | "google" | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const busy = pending !== null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const confirm = String(form.get("confirm") ?? "");

    if (mode === "signup" && password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }

    setError(null);
    setPending("credentials");

    const result =
      mode === "signup"
        ? await signUp.email({
            name,
            email,
            password,
            callbackURL: callbackURL(),
          })
        : await signIn.email({
            email,
            password,
            callbackURL: callbackURL(),
          });

    setPending(null);

    if (result.error) {
      setError(result.error.message || "Something went wrong. Try again.");
      return;
    }

    router.replace(routes.dashboard);
    router.refresh();
  }

  async function onGoogle() {
    setError(null);
    setPending("google");

    const result = await signIn.social({
      provider: "google",
      callbackURL: callbackURL(),
    });

    if (result.error) {
      setPending(null);
      setError(result.error.message || "Google sign-in failed. Try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <p className="rise text-xs font-medium tracking-[0.18em] text-sea uppercase">
        {copy.eyebrow}
      </p>
      <h1
        className="rise mt-3 font-heading text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[2rem]"
        style={{ animationDelay: "60ms" }}
      >
        {copy.title}
      </h1>
      <p
        className="rise mt-2 text-[15px] leading-6 text-pretty text-muted-foreground"
        style={{ animationDelay: "100ms" }}
      >
        {copy.subtitle}
      </p>

      <div
        className="rise mt-8 rounded-2xl border bg-card p-5 sm:p-6"
        style={{ animationDelay: "140ms" }}
      >
        <button
          type="button"
          disabled={busy}
          onClick={onGoogle}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 w-full gap-2 text-[0.95rem] transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97]",
          )}
        >
          {pending === "google" ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconBrandGoogle className="size-4" />
          )}
          Continue with Google
        </button>

        <div className="relative my-5">
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <span className="relative mx-auto flex w-fit bg-card px-3 text-xs text-muted-foreground">
            or email
          </span>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          {mode === "signup" ? (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={busy}
                placeholder="Ada Lovelace"
                className="h-11 px-3"
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
              placeholder="you@example.com"
              className="h-11 px-3"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                disabled={busy}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                className="h-11 px-3 pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground transition-[transform,color,background-color] duration-150 ease-out hover:text-foreground active:scale-[0.94]",
                )}
              >
                {showPassword ? (
                  <IconEyeOff className="size-4" />
                ) : (
                  <IconEye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {mode === "signup" ? (
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={busy}
                placeholder="Repeat your password"
                className="h-11 px-3"
              />
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 w-full gap-2 bg-sea text-[0.95rem] text-sea-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-sea/90 active:scale-[0.97]",
            )}
          >
            {pending === "credentials" ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : null}
            {copy.submit}
          </button>
        </form>
      </div>

      <p
        className="rise mt-6 text-center text-sm text-muted-foreground"
        style={{ animationDelay: "180ms" }}
      >
        {copy.switchPrompt}{" "}
        <Link
          href={copy.switchHref}
          className="font-medium text-foreground underline-offset-4 outline-none transition-colors duration-150 ease-out hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {copy.switchLabel}
        </Link>
      </p>

      {mode === "signup" ? (
        <p
          className="rise mt-3 text-center text-xs leading-5 text-muted-foreground"
          style={{ animationDelay: "200ms" }}
        >
          By creating an account you agree to the{" "}
          <Link
            href={routes.terms}
            className="underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href={routes.privacy}
            className="underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
