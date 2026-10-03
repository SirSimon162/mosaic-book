import Link from "next/link";

const sources = [
  "Attention Is All You Need.pdf",
  "Lecture notes.md",
  "Distillation notes",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1120px] items-center gap-14 px-6 py-16 lg:grid-cols-2 lg:py-24">
      <div>
        <p className="font-mono text-[11px] tracking-[0.18em] text-mute">
          PRIVATE WORKSPACE
        </p>
        <h1 className="mt-4 font-serif text-[44px] leading-[1.05] tracking-tight text-balance text-ink sm:text-[56px]">
          Ask the page you actually <em className="text-mark italic">read</em>.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
          Mosaic is a workspace for your own material. Add a paper, a note, or
          a link. Ask a question. The answer stays tied to the passage it came
          from.
        </p>
        <div className="mt-8 flex items-center gap-5">
          <Link
            href="/login?mode=signup"
            className="rounded-md bg-ink px-4 py-2 text-sm text-paper"
          >
            Sign up
          </Link>
          <a
            href="#path"
            className="text-sm text-ink underline decoration-rule underline-offset-4"
          >
            See the path
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-desk-line bg-desk text-cream shadow-[0_24px_50px_-28px_rgba(26,25,22,0.55)]">
        <div className="border-b border-desk-line px-4 py-3">
          <p className="font-mono text-[11px] tracking-[0.14em] text-cream/70">
            WORKSPACE · TRANSFORMERS
          </p>
        </div>
        <div className="grid sm:grid-cols-[168px_1fr]">
          <ul className="border-b border-desk-line sm:border-r sm:border-b-0">
            {sources.map((source, index) => (
              <li
                key={source}
                className={`border-l-2 px-3 py-3 font-mono text-[11px] leading-relaxed ${
                  index === 0
                    ? "border-mark text-cream"
                    : "border-transparent text-cream/55"
                }`}
              >
                {source}
              </li>
            ))}
          </ul>
          <div className="px-4 py-4">
            <p className="font-mono text-[10px] tracking-[0.16em] text-cream/45">
              ANSWER
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              A token can look across the sequence in one step, so recurrence
              is no longer required to connect distant words.{" "}
              <span className="text-mark">[1]</span> The notes flag the cost of
              that full comparison. <span className="text-mark">[2]</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
