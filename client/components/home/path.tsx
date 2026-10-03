export function Path() {
  return (
    <section id="path" className="scroll-mt-20 border-t border-rule">
      <div className="mx-auto max-w-[1120px] px-6 py-20">
        <p className="font-mono text-[11px] tracking-[0.18em] text-mute">
          HOW AN ANSWER IS MADE
        </p>
        <h2 className="mt-3 max-w-xl font-serif text-4xl tracking-tight text-balance text-ink">
          A question crosses three stations.
        </h2>

        <div className="relative mt-14">
          <div className="absolute top-[7px] right-0 left-0 hidden h-px bg-rule md:block" />
          <div className="grid gap-10 md:grid-cols-3">
            <article>
              <p className="relative z-10 inline-block bg-paper pr-3 font-mono text-[11px] text-mute">
                01
              </p>
              <h3 className="mt-4 font-serif text-2xl text-ink">Source</h3>
              <div className="mt-4 rounded-[10px] border border-rule bg-sheet p-4">
                <p className="font-mono text-xs leading-relaxed text-ink">
                  Attention Is All You Need.pdf
                </p>
                <span className="mt-3 inline-block rounded-md border border-rule px-2 py-0.5 font-mono text-[11px] text-mute">
                  p. 4
                </span>
              </div>
            </article>

            <article>
              <p className="relative z-10 inline-block bg-paper pr-3 font-mono text-[11px] text-mute">
                02
              </p>
              <h3 className="mt-4 font-serif text-2xl text-ink">Passage</h3>
              <div className="mt-4 rounded-[10px] border border-rule bg-sheet p-4">
                <p className="text-sm leading-relaxed text-ink">
                  Each position can{" "}
                  <span className="underline decoration-mark decoration-2 underline-offset-[3px]">
                    weigh the rest of the sequence
                  </span>{" "}
                  in a single step, instead of waiting on a chain of earlier
                  states.
                </p>
              </div>
            </article>

            <article>
              <p className="relative z-10 inline-block bg-paper pr-3 font-mono text-[11px] text-mute">
                03
              </p>
              <h3 className="mt-4 font-serif text-2xl text-ink">Answer</h3>
              <div className="mt-4 rounded-[10px] border border-rule bg-sheet p-4">
                <p className="text-sm leading-relaxed text-ink">
                  Attention lets a token relate to an earlier one without
                  recurrence. The comparison grows with the square of the
                  length. <span className="text-mark">[1]</span>
                </p>
              </div>
            </article>
          </div>
        </div>

        <p className="mt-10 font-mono text-xs text-mute">
          The citation is the point.
        </p>
      </div>
    </section>
  );
}
