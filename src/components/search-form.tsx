"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function SearchForm({ query }: { query: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // After a submit the native GET navigation remounts the page, so refocus
  // the query box for instant refinement. A session flag keeps cold loads of
  // shared `?q=` links from stealing focus (and popping the mobile keyboard).
  useEffect(() => {
    let submitted = false;
    try {
      submitted = sessionStorage.getItem("sumi-search-submitted") === "1";
      sessionStorage.removeItem("sumi-search-submitted");
    } catch {
      // Storage can be unavailable (private mode); fall back to no refocus.
    }
    if (!submitted || !query) return;
    const id = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    return () => cancelAnimationFrame(id);
  }, [query]);

  return (
    <form
      ref={formRef}
      action="/search"
      method="get"
      className="relative flex items-stretch gap-2"
      onSubmit={() => {
        try {
          sessionStorage.setItem("sumi-search-submitted", "1");
        } catch {
          // Best-effort; the submit still proceeds without the flag.
        }
      }}
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
          ref={inputRef}
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
