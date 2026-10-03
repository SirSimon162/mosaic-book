import Link from "next/link";

export function Close() {
  return (
    <section className="border-t border-rule">
      <div className="mx-auto max-w-[1120px] px-6 py-24">
        <h2 className="font-serif text-4xl tracking-tight text-balance text-ink sm:text-5xl">
          Start with one source.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-mute">
          A workspace is ready when the first file is in. You can add the rest
          as you read.
        </p>
        <div className="mt-8 flex items-center gap-5">
          <Link
            href="/login?mode=signup"
            className="rounded-md bg-ink px-4 py-2.5 text-sm text-paper"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="text-sm text-ink underline decoration-rule underline-offset-4"
          >
            I already have one
          </Link>
        </div>
      </div>
    </section>
  );
}
