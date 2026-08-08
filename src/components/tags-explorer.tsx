"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { TagInfo } from "@/content/store";
import { EmptyState } from "@/components/empty-state";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function TagsExplorer({ tags }: { tags: TagInfo[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const reduce = useReducedMotion();

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
        className="relative flex items-stretch gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <MagnifyingGlass
          size={16}
          weight="duotone"
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-faint"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tags…"
          aria-label="Search tags"
          className="field min-w-0 flex-1 pl-10"
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
        <EmptyState
          icon={<MagnifyingGlass size={20} weight="duotone" />}
          title={`No tags match “${query}”.`}
          hint="Try a broader keyword."
        />
      ) : (
        <motion.div
          layout={!reduce}
          className="divide-y divide-line border-t border-line"
        >
          <AnimatePresence initial={reduce ? false : undefined} mode="popLayout">
            {filtered.map((tag, i) => (
              <motion.div
                key={tag.name}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.985 }}
                transition={{
                  duration: 0.24,
                  delay: reduce ? 0 : Math.min(i * 0.035, 0.28),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  transitionTypes={["nav-forward"]}
                  className="group relative flex items-baseline justify-between rounded-md py-4 pl-3 pr-8 transition-[background-color,color] duration-[var(--dur-short)] ease-[var(--ease-out)] hover:bg-paper-deep/40 hover:text-seal sm:pr-10"
                >
                  <span className="font-serif text-lg text-ink transition-[transform,color] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-seal">
                    <span className="text-seal">#</span>
                    {tag.name}
                  </span>
                  <span className="text-sm text-ink-faint transition-colors group-hover:text-seal/80">
                    {tag.count} {tag.count === 1 ? "post" : "posts"}
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 font-serif text-lg text-seal opacity-0 transition-[transform,opacity] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    →
                  </span>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
