"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "../branding/brand";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Sources", href: "/#learn" },
      { label: "Chat", href: "/#workspace" },
      { label: "Learn", href: "/#learn" },
      { label: "Workspaces", href: "/#workspace" },
    ],
  },
  {
    title: "Workspace",
    links: [{ label: "Open Mosaic", href: "/mosaic" }],
  },
];

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="border-t border-[var(--border-inverse)]/10 bg-inverse text-inverse">
      <div className="w-full px-6 py-14 sm:px-10 lg:px-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="inline-flex items-center">
              <Brand light />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--color-inverse)]/60">
              A private workspace for the material you ask about.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-tertiary text-[11px] tracking-[0.14em] text-[var(--color-inverse)]/45">
                {column.title.toUpperCase()}
              </p>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-inverse)]/85 hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="font-tertiary text-[11px] tracking-[0.14em] text-[var(--color-inverse)]/45">
              COLOPHON
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-inverse)]/60">
              Newsreader and Geist. Set on a 12-column grid. Citations marked
              in cobalt.
            </p>
          </div>
        </div>

        <p className="mt-12 border-t border-[var(--border-inverse)]/10 pt-6 font-tertiary text-[11px] text-[var(--color-inverse)]/45">
          © 2026 Mosaic · Sources stay in your workspace.
        </p>
      </div>
    </footer>
  );
}
