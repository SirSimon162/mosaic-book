import Link from "next/link";

import { MosaicLogo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";

const links = [
  { label: "Dashboard", href: routes.dashboard },
  { label: "Sign in", href: routes.login },
  { label: "Terms", href: routes.terms },
  { label: "Privacy", href: routes.privacy },
];

export function Footer() {
  return (
    <footer className="relative z-20 border-t">
      <div className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between">
        <Link href={routes.home} aria-label="Mosaic home" className="shrink-0">
          <MosaicLogo />
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md text-sm text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-sm text-muted-foreground">© 2026 Mosaic</p>
      </div>
    </footer>
  );
}
