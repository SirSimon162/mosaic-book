import { stackSection } from "./section";

const practices = [
  {
    number: "01",
    title: "Sources",
    body: "The library for one subject. Sheets, videos, sites, documents, and notes live together.",
  },
  {
    number: "02",
    title: "Chat",
    body: "Ask anything in that library, including the numbers. Each reply can point back to the place.",
  },
  {
    number: "03",
    title: "Learn",
    body: "Notes and cards drawn from the same sources, so the study set stays with the material.",
  },
];

function SourcesFragment() {
  const files = ["results.xlsx", "youtube.com/methods", "protocol.org"];

  return (
    <ul className="mt-6 overflow-hidden rounded-xl bg-primary font-tertiary text-[11px]">
      {files.map((file, index) => (
        <li
          key={file}
          className={`border-b border-primary px-3 py-2.5 last:border-b-0 ${
            index === 0 ? "text-accent" : "text-primary"
          }`}
        >
          {file}
        </li>
      ))}
    </ul>
  );
}

function ChatFragment() {
  return (
    <div className="mt-6 rounded-xl bg-primary px-3 py-3">
      <p className="font-tertiary text-[10px] tracking-[0.14em] text-secondary">YOU</p>
      <p className="mt-1 text-sm text-primary">Is the mean difference large?</p>
      <p className="mt-3 font-tertiary text-[10px] tracking-[0.14em] text-secondary">
        MOSAIC
      </p>
      <p className="mt-1 text-sm leading-relaxed text-primary">
        On this sheet, treated sits 1.4 above control.{" "}
        <span className="font-medium text-accent">[1]</span>
      </p>
    </div>
  );
}

function LearnFragment() {
  return (
    <div className="mt-6 rounded-xl bg-primary px-4 py-4">
      <p className="font-tertiary text-[10px] tracking-[0.14em] text-accent">CARD</p>
      <p className="mt-2 font-secondary text-lg leading-snug text-primary">
        What does the sheet compare?
      </p>
      <p className="mt-3 border-t border-primary pt-3 text-sm leading-relaxed text-secondary">
        Treated rows against the control block, before any model.
      </p>
    </div>
  );
}

const fragments = [SourcesFragment, ChatFragment, LearnFragment];

export function Practices() {
  return (
    <section className={`${stackSection} bg-tertiary`}>
      <div
        data-sheet
        className="grid h-full w-full content-center gap-4 overflow-y-auto px-6 pt-24 sm:px-10 md:grid-cols-3 lg:px-16"
      >
        {practices.map((practice, index) => {
          const Fragment = fragments[index];
          return (
            <article
              key={practice.title}
              className="flex h-full flex-col rounded-2xl border border-primary bg-secondary p-6 transition duration-200 hover:-translate-y-1 hover:border-accent"
            >
              <p className="font-tertiary text-[11px] text-accent">{practice.number}</p>
              <h2 className="mt-3 font-secondary text-3xl tracking-tight text-primary">
                {practice.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">{practice.body}</p>
              <Fragment />
            </article>
          );
        })}
      </div>
    </section>
  );
}
