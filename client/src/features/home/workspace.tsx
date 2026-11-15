import { stackSection } from "./section";

const sources = [
  { title: "results.xlsx", cited: true },
  { title: "Methods · YouTube", cited: false },
  { title: "protocol.org", cited: false },
];

export function Workspace() {
  return (
    <section className={`${stackSection} bg-inverse text-inverse`}>
      <div data-sheet className="flex h-full w-full flex-col px-6 pt-24 pb-8 sm:px-10 lg:px-16">
        <p className="font-tertiary text-[11px] tracking-[0.18em] text-[var(--color-inverse)]/50">
          THE DESK
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl tracking-tight text-balance sm:text-6xl">
          One subject, one desk.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-inverse)]/70">
          A workspace holds the sources, the thread, and the notes for a single
          subject. A sheet, a video, a site, or a file.
        </p>

        <div className="mt-8 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[var(--border-inverse)]/10 bg-[var(--surface)] text-primary shadow-stage-deep">
          <div className="flex items-center gap-2 border-b border-primary px-4 py-3">
            <span className="live-dot size-1.5 rounded-full bg-accent" />
            <p className="font-tertiary text-[11px] tracking-[0.14em] text-secondary">
              FIELD TRIAL
            </p>
          </div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_1fr_280px]">
            <div className="border-b border-primary lg:border-r lg:border-b-0">
              <p className="px-4 pt-4 font-tertiary text-[10px] tracking-[0.16em] text-secondary">
                SOURCES
              </p>
              <ul className="mt-2 pb-3">
                {sources.map((source) => (
                  <li
                    key={source.title}
                    className={`mx-2 rounded-md px-2 py-2 font-tertiary text-[11px] leading-relaxed ${
                      source.cited ? "cite-pulse text-primary" : "text-secondary"
                    }`}
                  >
                    {source.title}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-b border-primary px-4 py-4 lg:border-r lg:border-b-0">
              <p className="font-tertiary text-[10px] tracking-[0.16em] text-secondary">
                CHAT
              </p>
              <p className="mt-3 text-sm text-secondary">Why is the treated mean higher?</p>
              <p className="mt-3 text-sm leading-relaxed">
                The treated block on sheet 2 averages 18.6, and the control
                block averages 17.2.{" "}
                <span className="cite-pulse rounded px-1 font-medium text-accent">
                  [1]
                </span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The lecture at 12:40 calls that gap descriptive.{" "}
                <span className="font-medium text-accent">[2]</span>
              </p>
            </div>

            <div className="bg-[var(--bg-tertiary)]/60 px-4 py-4">
              <p className="font-tertiary text-[10px] tracking-[0.16em] text-accent">
                NOTE
              </p>
              <p className="mt-3 font-secondary text-lg leading-snug">From the sheet</p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The treated rows are the ones the lecture walks through. The
                site only lists the protocol.
              </p>
              <p className="mt-4 font-tertiary text-[11px] text-accent">tied to [1]</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
