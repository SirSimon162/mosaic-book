import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

import { Reveal } from "@/components/shared/reveal";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="page-shell pt-8 pb-16 sm:py-28">
      <Reveal>
        <div className="rounded-[1.75rem] border bg-card px-6 py-10 text-center sm:px-12 sm:py-20">
          <h2 className="mx-auto max-w-xl font-heading text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
            Start your first mosaic.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-pretty text-muted-foreground">
            Create an account now and the dashboard opens to you as soon as your
            workspace is ready.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={routes.signup}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full gap-2 bg-sea px-5 text-[0.95rem] text-sea-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-sea/90 active:scale-[0.97] sm:w-auto",
              )}
            >
              Get started
              <IconArrowRight className="size-4" />
            </Link>

            <Link
              href={routes.login}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 w-full px-5 text-[0.95rem] transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] sm:w-auto",
              )}
            >
              Sign in
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
