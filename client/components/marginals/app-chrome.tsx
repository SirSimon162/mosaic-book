import type { ReactNode } from "react";

import { Footer } from "@/components/marginals/footer";
import { HomeShell } from "@/components/marginals/home-shell";
import { Navbar } from "@/components/marginals/navbar";

type AppChromeProps = {
  children: ReactNode;
  /** `home` = 1000px + gutters; `full` = unrestricted width */
  variant?: "home" | "full";
};

export function AppChrome({ children, variant = "full" }: AppChromeProps) {
  if (variant === "home") {
    return (
      <>
        <Navbar framed />
        <HomeShell>
          <main className="relative z-20 flex-1">{children}</main>
          <Footer />
        </HomeShell>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="site-shell">
        <main className="relative z-20 flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}
