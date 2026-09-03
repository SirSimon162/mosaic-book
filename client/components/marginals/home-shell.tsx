import type { ReactNode } from "react";

/** Home-only: 1000px max width + striped gutter rails. */
export function HomeShell({ children }: { children: ReactNode }) {
  return (
    <div className="home-frame">
      <aside aria-hidden="true" className="gutter-rail gutter-rail-left" />
      <div className="home-frame-main">{children}</div>
      <aside aria-hidden="true" className="gutter-rail gutter-rail-right" />
    </div>
  );
}
