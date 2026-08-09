"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { TagInfo } from "@/content/store";
import { getTagsLibraryAction } from "@/app/write/actions";

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [library, setLibrary] = useState<TagInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    getTagsLibraryAction().then((tags) => {
      if (!alive) return;
      setLibrary(tags);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const pool = library.filter((t) => !value.includes(t.name));
    if (!q) return pool.slice(0, 12);
    return pool.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 12);
  }, [library, value, q]);

  const activeIndex = Math.min(active, Math.max(suggestions.length - 1, 0));
  const canCreate =
    q.length > 0 &&
    !value.some((t) => t.toLowerCase() === q) &&
    !library.some((t) => t.name.toLowerCase() === q);
  const createLabel = q.length > 0 && canCreate ? q : undefined;

  function addTag(name: string) {
    const clean = name.trim().replace(/^#/, "").slice(0, 40);
    if (!clean || value.includes(clean)) return;
    onChange([...value, clean]);
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  return (
    <div className="relative mt-3">
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-2 rounded border border-line-strong bg-paper px-2 py-1.5 transition focus-within:border-seal/70 focus-within:ring-2 focus-within:ring-seal/25">
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              key={tag}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-sm text-ink"
            >
              #{tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => removeTag(tag)}
                className="text-ink-faint transition-colors hover:text-seal"
              >
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) =>
                Math.min(a + 1, suggestions.length + (createLabel ? 1 : 0) - 1)
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const list = createLabel
                ? [...suggestions.map((t) => t.name), createLabel]
                : suggestions.map((t) => t.name);
              const pick = list[activeIndex] ?? list[0];
              if (pick) addTag(pick);
            } else if (e.key === "Backspace" && !query && value.length > 0) {
              removeTag(value[value.length - 1]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={value.length === 0 ? "Search or add tags…" : ""}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint/70 focus:outline-none"
        />
      </div>
      {open ? (
        <div className="panel-enter absolute z-20 left-0 right-0 mt-1.5 max-h-56 overflow-auto rounded-card border border-line bg-paper shadow-pop">
          {!loaded ? (
            <p className="px-3 py-2 text-sm text-ink-faint">Loading tags…</p>
          ) : suggestions.length === 0 && !createLabel ? (
            <p className="px-3 py-2 text-sm text-ink-faint">No tags yet.</p>
          ) : (
            suggestions.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => addTag(t.name)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                  i === activeIndex ? "bg-seal-wash/60" : ""
                }`}
              >
                <span
                  className={`transition-colors ${
                    i === activeIndex ? "text-seal" : "text-ink"
                  }`}
                >
                  #{t.name}
                </span>
                <span className="text-xs text-ink-faint">{t.count}</span>
              </button>
            ))
          )}
          {createLabel ? (
            <button
              type="button"
              onMouseEnter={() => setActive(suggestions.length)}
              onClick={() => addTag(createLabel)}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                activeIndex === suggestions.length
                  ? "bg-seal-wash/60 text-seal"
                  : "text-ink"
              }`}
            >
              Create “{createLabel}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
