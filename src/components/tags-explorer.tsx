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
              className="group flex items-baseline justify-between py-4 transition-colors hover:text-seal"
            >
              <span className="font-serif text-lg text-ink transition-colors group-hover:text-seal">
                <span className="text-seal">#</span>
                {tag.name}
              </span>
              <span className="text-sm text-ink-faint">
                {tag.count} {tag.count === 1 ? "post" : "posts"}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
