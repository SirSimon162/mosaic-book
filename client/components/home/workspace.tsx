const sources = [
  { title: "Attention Is All You Need.pdf", cited: true },
  { title: "Lecture notes.md", cited: false },
  { title: "Annotated transformer", cited: false },
];

export function Workspace() {
  return (
    <section id="workspace" className="scroll-mt-20 border-t border-rule">
      <div className="mx-auto max-w-[1120px] px-6 py-20">
        <h2 className="font-serif text-4xl tracking-tight text-balance text-ink">
          One subject, one desk.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-mute">
          A workspace holds the sources, the threads, and the notes for a
          single subject.
        </p>

        <div className="mt-10 overflow-hidden rounded-[10px] border border-desk-line bg-desk text-cream shadow-[0_24px_50px_-28px_rgba(26,25,22,0.55)]">
          <div className="border-b border-desk-line px-4 py-3">
            <p className="font-mono text-[11px] tracking-[0.14em] text-cream/55">
              TRANSFORMERS
            </p>
          </div>
          <div className="grid lg:grid-cols-[220px_1fr_240px]">
            <div className="border-b border-desk-line lg:border-r lg:border-b-0">
              <p className="px-4 pt-4 font-mono text-[10px] tracking-[0.16em] text-cream/40">
                SOURCES
              </p>
              <ul className="mt-2">
                {sources.map((source) => (
                  <li
                    key={source.title}
                    className={`px-4 py-2.5 font-mono text-[11px] leading-relaxed ${
                      source.cited
                        ? "cite-pulse text-cream"
                        : "text-cream/55"
                    }`}
                  >
                    {source.title}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-b border-desk-line px-4 py-4 lg:border-r lg:border-b-0">
              <p className="font-mono text-[10px] tracking-[0.16em] text-cream/40">
                CHAT
              </p>
              <p className="mt-3 text-sm text-cream/70">Why drop recurrence?</p>
              <p className="mt-3 text-sm leading-relaxed">
                So a token can relate to an earlier one in a single step,
                without a chain of hidden states.{" "}
                <span className="cite-pulse rounded px-0.5 text-mark">[1]</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream/80">
                The lecture notes call out the cost of that full comparison.{" "}
                <span className="text-mark">[2]</span>
              </p>
            </div>

            <div className="px-4 py-4">
              <p className="font-mono text-[10px] tracking-[0.16em] text-cream/40">
                NOTE
              </p>
              <p className="mt-3 font-serif text-lg leading-snug">From p. 4</p>
              <p className="mt-3 text-sm leading-relaxed text-cream/80">
                Attention stands in for recurrence when distance in the
                sequence matters.
              </p>
              <p className="mt-4 font-mono text-[11px] text-mark">tied to [1]</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
