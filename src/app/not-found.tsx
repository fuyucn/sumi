import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageTransition } from "@/components/page-transition";

/** Typographic 404, matching the landed full-site design: oversized serif
 * digits, "This page dried up", one CTA back into the archive. */
export default function NotFound() {
  return (
    <PageTransition>
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col items-center justify-center px-5 py-24 text-center">
        <p
          aria-hidden
          className="rise font-serif text-[clamp(6rem,22vw,13rem)] font-semibold leading-none tracking-[-0.04em] text-ink select-none"
        >
          4<em className="hero-accent">0</em>4
        </p>
        <h1 className="rise rise-delay-1 mt-2 font-serif text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          This page dried up
        </h1>
        <p className="rise rise-delay-2 mx-auto mt-3 max-w-md font-serif text-[1.0625rem] leading-relaxed text-ink-muted">
          The ink faded, the URL was misread, or the essay was moved. Either
          way, the archive is still here.
        </p>
        <div className="rise rise-delay-3 mt-9">
          <Link
            href="/posts"
            transitionTypes={["nav-back"]}
            className="btn-primary group px-6 py-3"
          >
            Back to the archive
            <ArrowRight
              size={16}
              weight="duotone"
              aria-hidden
              className="transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
