const practices = [
  {
    number: "01",
    title: "Sources",
    body: "The library for one subject. Files, notes, pages, and transcripts live together.",
  },
  {
    number: "02",
    title: "Chat",
    body: "Questions against that library. Each reply can point back to the passage.",
  },
  {
    number: "03",
    title: "Learn",
    body: "Notes and flashcards drawn from the same sources, so the study set stays with the text.",
  },
];

function SourcesFragment() {
  const files = [
    "Attention Is All You Need.pdf",
    "Lecture notes.md",
    "karpathy.github.io",
  ];

  return (
    <ul className="mt-6 overflow-hidden rounded-[10px] bg-desk font-mono text-[11px] text-cream">
      {files.map((file) => (
        <li key={file} className="border-b border-desk-line px-3 py-2.5 last:border-b-0">
          {file}
        </li>
      ))}
    </ul>
  );
}

function ChatFragment() {
  return (
    <div className="mt-6 rounded-[10px] bg-desk px-3 py-3 text-cream">
      <p className="font-mono text-[10px] tracking-[0.14em] text-cream/45">
        YOU
      </p>
      <p className="mt-1 text-sm">What does attention replace?</p>
      <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-cream/45">
        MOSAIC
      </p>
      <p className="mt-1 text-sm leading-relaxed">
        Recurrence, when relating distant tokens.{" "}
        <span className="text-mark">[1]</span>
      </p>
    </div>
  );
}

function LearnFragment() {
  return (
    <div className="mt-6 rounded-[10px] bg-desk px-4 py-4 text-cream">
      <p className="font-mono text-[10px] tracking-[0.14em] text-cream/45">
        CARD
      </p>
      <p className="mt-2 font-serif text-lg leading-snug">
        What does attention replace?
      </p>
      <p className="mt-3 border-t border-desk-line pt-3 text-sm leading-relaxed text-cream/80">
        Recurrence, for relating distant tokens in one step.
      </p>
    </div>
  );
}

const fragments = [SourcesFragment, ChatFragment, LearnFragment];

export function Practices() {
  return (
    <section id="learn" className="scroll-mt-20 border-t border-rule">
      <div className="mx-auto grid max-w-[1120px] gap-14 px-6 py-20 md:grid-cols-3">
        {practices.map((practice, index) => {
          const Fragment = fragments[index];
          return (
            <article key={practice.title}>
              <p className="font-mono text-[11px] text-mute">{practice.number}</p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink">
                {practice.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-mute">
                {practice.body}
              </p>
              <Fragment />
            </article>
          );
        })}
      </div>
    </section>
  );
}
