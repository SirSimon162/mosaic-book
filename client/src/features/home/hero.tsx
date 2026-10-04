import { EnterLink } from "@/features/auth/enter-link";
import { stackSection } from "./section";

const sources = ["results.xlsx", "Methods · YouTube", "field-notes.md"];

export function Hero() {
  return (
    <section data-hero className={`${stackSection} bg-inverse text-inverse`}>
      <div className="pointer-events-none absolute top-16 right-[8%] size-72 rounded-full bg-[var(--color-accent)]/30 blur-3xl" />
      <div
        data-sheet
        className="relative grid h-full w-full items-center gap-10 px-6 pt-24 sm:px-10 lg:grid-cols-2 lg:px-16"
      >
        <div>
          <p className="inline-flex items-center gap-2 font-tertiary text-[11px] tracking-[0.18em] text-[var(--color-inverse)]/60">
            <span className="live-dot size-1.5 rounded-full bg-accent" />
            PRIVATE WORKSPACE
          </p>
          <h1 className="mt-5 max-w-xl font-secondary text-5xl leading-[0.95] tracking-tight text-balance sm:text-7xl">
            Ask the material you actually <em className="text-accent italic">have</em>.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--color-inverse)]/75">
            Bring a document, a spreadsheet, a site, or a video. Ask about the
            argument or the numbers. The answer stays tied to the place it came
            from.
          </p>
          <div className="mt-8 flex items-center gap-5">
            <EnterLink className="rounded-full bg-accent px-5 py-2.5 text-sm text-on-accent">
              Open Mosaic
            </EnterLink>
            <a
              href="#path"
              className="text-sm text-inverse underline decoration-[var(--color-inverse)]/30 underline-offset-4"
            >
              See the path
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-inverse)]/10 bg-secondary text-primary shadow-stage">
          <div className="flex items-center justify-between gap-3 border-b border-primary px-4 py-3">
            <p className="min-w-0 truncate font-tertiary text-[11px] tracking-[0.14em] text-secondary">
              WORKSPACE · FIELD TRIAL
            </p>
            <span className="shrink-0 rounded-full bg-tertiary px-2 py-0.5 font-tertiary text-[10px] text-accent">
              2 citations
            </span>
          </div>
          <div className="grid sm:grid-cols-[168px_1fr]">
            <ul className="border-b border-primary sm:border-r sm:border-b-0">
              {sources.map((source, index) => (
                <li
                  key={source}
                  className={`border-l-2 px-3 py-3 font-tertiary text-[11px] leading-relaxed ${
                    index === 0
                      ? "border-accent bg-tertiary text-primary"
                      : "border-transparent text-secondary"
                  }`}
                >
                  {source}
                </li>
              ))}
            </ul>
            <div className="px-4 py-4">
              <p className="font-tertiary text-[10px] tracking-[0.16em] text-secondary">
                ANSWER
              </p>
              <p className="mt-3 text-sm leading-relaxed">
                On this sheet the treated mean sits 1.4 above the control.{" "}
                <span className="font-medium text-accent">[1]</span> The lecture
                says those are raw scores, not a fitted model.{" "}
                <span className="font-medium text-accent">[2]</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
