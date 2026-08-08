"use client";
import { useMemo, useState } from "react";
import type { TagInfo } from "@/content/store";

export function TagsExplorer({ tags }: { tags: TagInfo[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, q]);

  return (
    <div>
      <form
        action="/tags"
        method="get"
        role="search"
        className="flex items-stretch gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tags…"
          aria-label="Search tags"
          className="field min-w-0 flex-1"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="btn-ghost shrink-0 px-4"
          >
            Clear
          </button>
        ) : null}
      </form>

      {filtered.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          No tags match “{query}”.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {filtered.map((tag) => (
            <a
              key={tag.name}
              href={`/tag/${encodeURIComponent(tag.name)}`}
              className="group relative flex items-baseline justify-between rounded-md py-4 pl-3 pr-8 transition-[background-color,color] duration-200 ease-out hover:bg-paper-deep/40 hover:text-seal sm:pr-10"
            >
              <span className="font-serif text-lg text-ink transition-[transform,color] duration-300 ease-out group-hover:translate-x-1 group-hover:text-seal">
                <span className="text-seal">#</span>
                {tag.name}
              </span>
              <span className="text-sm text-ink-faint transition-colors group-hover:text-seal/80">
                {tag.count} {tag.count === 1 ? "post" : "posts"}
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 font-serif text-lg text-seal opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              >
                →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
