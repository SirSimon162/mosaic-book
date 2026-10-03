import Link from "next/link";
import { Mark } from "./mark";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Sources", href: "#learn" },
      { label: "Chat", href: "#workspace" },
      { label: "Learn", href: "#learn" },
      { label: "Workspaces", href: "#workspace" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/login?mode=signup" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1120px] px-6 py-14">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 font-medium">
              <Mark />
              Mosaic
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mute">
              A private workspace for the sources you study.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-mono text-[11px] tracking-[0.14em] text-mute">
                {column.title.toUpperCase()}
              </p>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href} className="text-sm text-ink">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-ink">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-mute">
              COLOPHON
            </p>
            <p className="mt-4 text-sm leading-relaxed text-mute">
              Newsreader and Geist. Set on a 12-column grid. Citations marked
              in sienna.
            </p>
          </div>
        </div>

        <p className="mt-12 border-t border-rule pt-6 font-mono text-[11px] text-mute">
          © 2026 Mosaic · Sources stay in your workspace.
        </p>
      </div>
    </footer>
  );
}
