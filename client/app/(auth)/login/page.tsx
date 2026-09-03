import type { Metadata } from "next";

import { AuthPanel } from "@/components/pages/auth";

export const metadata: Metadata = {
  title: "Sign in — Mosaic",
  description: "Sign in to Mosaic and keep working from the sources you already added.",
};

export default function LoginPage() {
  return <AuthPanel mode="login" />;
}
