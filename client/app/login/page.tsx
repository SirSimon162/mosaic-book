import Link from "next/link";
import { Mark } from "@/components/home/mark";
import { AuthForm } from "./auth-form";

export const metadata = {
  title: "Log in · Mosaic",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "login";

  return (
    <>
      <div className="border-b border-rule">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center px-6">
          <Link href="/" className="inline-flex items-center gap-2 font-medium">
            <Mark />
            Mosaic
          </Link>
        </div>
      </div>
      <main className="mx-auto w-full max-w-sm px-6 py-16">
        <AuthForm mode={mode} />
      </main>
    </>
  );
}
