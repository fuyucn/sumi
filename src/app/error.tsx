"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowCounterClockwise, HouseLine } from "@phosphor-icons/react";

/**
 * Root error boundary. Route segments render this in place of the default
 * Next error page, so a failed query or render still lands on paper instead
 * of a bare white screen.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Only a single line to the console; the error itself already streamed.
    console.error("Sumi page error:", error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-24 text-center">
      <p className="rise text-xs font-medium uppercase tracking-[0.14em] text-seal">
        Interrupted
      </p>
      <h1 className="rise rise-delay-1 mt-4 font-serif text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        The ink ran dry
      </h1>
      <p className="rise rise-delay-2 mt-4 max-w-sm font-serif text-[1.0625rem] leading-relaxed text-ink-muted">
        Something interrupted this page before it finished printing. Your words
        are safe here — try again, or head back to the shelves.
      </p>

      <div className="rise rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={retry} className="btn-primary px-6 py-3">
          <ArrowCounterClockwise size={16} weight="duotone" aria-hidden />
          Try again
        </button>
        <Link href="/" transitionTypes={["nav-back"]} className="btn-ghost px-6 py-3">
          <HouseLine size={16} weight="duotone" aria-hidden />
          Back home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 font-mono text-[0.6875rem] text-ink-faint tabular-nums">
          {error.digest}
        </p>
      ) : null}
    </main>
  );
}
