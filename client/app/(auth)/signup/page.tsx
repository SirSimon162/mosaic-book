import type { Metadata } from "next";

import { AuthPanel } from "@/components/pages/auth";

export const metadata: Metadata = {
  title: "Create account — Mosaic",
  description:
    "Create a Mosaic account to drop in sources and start asking questions grounded in your files.",
};

export default function SignupPage() {
  return <AuthPanel mode="signup" />;
}
