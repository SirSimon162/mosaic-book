"use client";

import { FormEvent } from "react";
import Link from "next/link";

type Mode = "login" | "signup";

const inputClass =
  "mt-1 w-full rounded-md border border-rule bg-sheet px-3 py-2 text-ink outline-none focus:border-mark";

export function AuthForm({ mode }: { mode: Mode }) {
  const isLogin = mode === "login";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {isLogin ? "Log in" : "Sign up"}
      </h1>
      <p className="mt-2 text-sm text-mute">
        {isLogin
          ? "Use your email and password."
          : "Create an account with your email."}
      </p>

      <div className="mt-6 flex border-b border-rule text-sm">
        <Link
          href="/login"
          className={`px-3 py-2 ${isLogin ? "border-b-2 border-ink font-medium" : "text-mute"}`}
        >
          Log in
        </Link>
        <Link
          href="/login?mode=signup"
          className={`px-3 py-2 ${isLogin ? "text-mute" : "border-b-2 border-ink font-medium"}`}
        >
          Sign up
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!isLogin && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-ink">First name</span>
              <input
                name="firstName"
                type="text"
                autoComplete="given-name"
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink">Last name</span>
              <input
                name="lastName"
                type="text"
                autoComplete="family-name"
                className={inputClass}
              />
            </label>
          </div>
        )}

        <label className="block text-sm">
          <span className="text-ink">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-ink px-3 py-2 text-sm text-paper"
        >
          {isLogin ? "Log in" : "Create account"}
        </button>
      </form>
    </>
  );
}
