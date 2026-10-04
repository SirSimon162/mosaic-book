"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/features/shell/footer";
import { Navbar } from "@/features/shell/navbar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/mosaic") {
    return <div className="h-dvh overflow-hidden">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <div className="flex-1 pt-14 has-[[data-hero]]:!pt-0 md:pt-16">{children}</div>
      <Footer />
    </>
  );
}
