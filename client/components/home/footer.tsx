import Link from "next/link";
import { stackSection } from "./section";

export function HomeFooter() {
  return (
    <section className={`${stackSection} bg-inverse text-inverse`}>
      <div data-sheet className="flex h-full w-full flex-col justify-end px-6 pt-24 pb-8 sm:px-10 lg:px-16">
        <h2 className="max-w-5xl font-secondary text-6xl leading-[0.95] tracking-tight text-balance sm:text-8xl">
          Bring the source.
        </h2>
        <div className="mt-10 grid w-full grid-cols-2 border-t border-[var(--border-inverse)]/25">
          <div className="border-r border-[var(--border-inverse)]/25 py-8 pr-6 sm:pr-12 lg:py-10">
            <p className="font-tertiary text-[11px] tracking-[0.16em] text-[var(--color-inverse)]/45">
              THE PLACE
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-inverse)]/80 sm:text-lg">
              An answer is only as good as the place it came from. A cell, a
              timestamp, a line, or a page. Check that place instead of trusting
              the summary.
            </p>
            <Link
              href="/#path"
              className="mt-6 inline-block text-sm text-accent underline underline-offset-4"
            >
              See how a citation is made
            </Link>
          </div>
          <div className="py-8 pl-6 sm:pl-12 lg:py-10">
            <p className="font-tertiary text-[11px] tracking-[0.16em] text-[var(--color-inverse)]/45">
              THE DESK
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-inverse)]/80 sm:text-lg">
              A workspace is private. Start with one file, a link, or a video.
              The sources, the thread, and the cards stay on the same subject.
            </p>
            <Link
              href="/mosaic"
              className="mt-6 inline-block text-sm text-accent underline underline-offset-4"
            >
              Open a workspace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
