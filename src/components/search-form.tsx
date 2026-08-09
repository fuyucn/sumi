"use client";

import Link from "next/link";
import { useRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function SearchForm({ query }: { query: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action="/search"
      method="get"
      className="relative flex items-stretch gap-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
    >
      <MagnifyingGlass
        size={16}
        weight="duotone"
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-faint"
      />
      <div className="relative min-w-0 flex-1">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search posts…"
          aria-label="Search posts"
          className="field min-w-0 w-full pl-10 pr-12"
        />
        {!query ? (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line-strong bg-paper-deep px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-faint"
          >
            ⌘K
          </kbd>
        ) : null}
      </div>
      <button type="submit" className="btn-primary shrink-0 px-5">
        Search
      </button>
      {query ? (
        <Link
          href="/search"
          transitionTypes={["nav-back"]}
          className="btn-ghost shrink-0 px-4"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
