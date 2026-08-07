import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-24 text-center rise">
      <p
        aria-hidden
        className="font-serif text-[5rem] leading-none text-seal/20 select-none sm:text-[7rem]"
      >
        404
      </p>
      <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight text-ink text-balance">
        This page has been misplaced
      </h1>
      <p className="mx-auto mt-3 max-w-sm font-serif text-[1.0625rem] leading-relaxed text-ink-muted">
        The shelf you were looking for is empty, or the address was written
        down wrong. Either way, the ink is still dry here.
      </p>
      <Link
        href="/"
        className="press mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
      >
        Back to the first page
      </Link>
    </main>
  );
}
