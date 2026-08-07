"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { CaretUp, ListBullets, X } from "@phosphor-icons/react";

export interface ReadingSection {
  id: string;
  label: string;
}

const RADIUS = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Reading progress pill (bottom-right). Shows a ring that fills with scroll
 * progress plus the current section label; clicking expands a squircle menu
 * that smooth-scrolls to any heading. Falls back to a plain percentage when
 * no sections are provided.
 */
export function ReadingProgress({
  sections = [],
  className = "",
}: {
  sections?: ReadingSection[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(-1);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const { scrollYProgress } = useScroll();
  const spring = useSpring(
    scrollYProgress,
    reduce ? { stiffness: 1000, damping: 100 } : { stiffness: 120, damping: 26, mass: 0.3 },
  );
  useMotionValueEvent(spring, "change", (v) => setProgress(v));

  useEffect(() => {
    if (sections.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const probe = window.scrollY + window.innerHeight * 0.35;
      let idx = -1;
      for (let i = 0; i < sections.length; i++) {
        const el = document.getElementById(sections[i].id);
        if (!el) continue;
        if (el.getBoundingClientRect().top + window.scrollY <= probe) idx = i;
        else break;
      }
      setCurrent(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sections]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const hasSections = sections.length > 0;
  const label = hasSections && current >= 0 ? sections[current].label : null;

  const jump = useCallback(
    (id: string) => {
      setOpen(false);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    },
    [reduce],
  );

  if (!mounted) return null;

  return createPortal(
    <div ref={rootRef} className={`fixed right-5 bottom-6 z-50 flex flex-col items-end ${className}`}>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="menu"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mb-2 w-64 origin-bottom-right overflow-hidden rounded-card border border-line bg-paper-raised/95 shadow-pop backdrop-blur-md"
            role="list"
            aria-label="Sections"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-faint">
              <span>On this page</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="press rounded-full p-1 text-ink-faint transition-colors hover:text-ink"
                aria-label="Close sections"
              >
                <X size={13} aria-hidden />
              </button>
            </div>
            <ul className="max-h-64 overflow-y-auto p-2">
              {sections.map((s, i) => {
                const active = i === current;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => jump(s.id)}
                      className={[
                        "press w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-seal-wash font-medium text-seal"
                          : "text-ink-soft hover:bg-paper-deep hover:text-ink",
                      ].join(" ")}
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => hasSections && setOpen((v) => !v)}
        aria-expanded={hasSections ? open : undefined}
        aria-label="Reading progress"
        title="Reading progress"
        className="group flex items-center gap-2.5 rounded-full border border-line bg-paper-raised/90 py-1.5 pr-4 pl-1.5 shadow-card backdrop-blur-md transition-colors hover:border-line-strong"
      >
        <span className="relative flex h-8 w-8 items-center justify-center" aria-hidden>
          <svg viewBox="0 0 28 28" className="h-8 w-8 -rotate-90">
            <circle
              cx="14"
              cy="14"
              r={RADIUS}
              fill="none"
              strokeWidth="2.5"
              className="stroke-line-strong"
              opacity="0.45"
            />
            <circle
              cx="14"
              cy="14"
              r={RADIUS}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stroke-seal"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          {hasSections && current >= 0 ? (
            <ListBullets size={12} weight="bold" className="absolute text-ink-faint" />
          ) : (
            <span className="absolute text-[9px] font-semibold text-ink-faint tabular-nums">
              {percent}
            </span>
          )}
        </span>
        {label ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="max-w-44 truncate text-sm font-medium text-ink-soft"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        ) : (
          <span className="min-w-9 text-sm font-medium text-ink-soft tabular-nums">{percent}%</span>
        )}
        {hasSections ? (
          <CaretUp
            size={14}
            weight="bold"
            className={[
              "text-ink-faint transition-transform duration-200",
              open ? "" : "rotate-180",
            ].join(" ")}
            aria-hidden
          />
        ) : null}
      </button>
    </div>,
    document.body,
  );
}
