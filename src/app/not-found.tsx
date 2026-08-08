"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { PageTransition } from "@/components/page-transition";

/** True only on pointer-fine devices; touch devices skip the spotlight. */
function useHoverCapable() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return canHover;
}

export default function NotFound() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const enabled = !reduce && canHover;

  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const mask = useMotionTemplate`radial-gradient(240px circle at ${mx}% ${my}%, #000 25%, transparent 72%)`;

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !enabled) return;
    const rect = el.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width) * 100);
    my.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <PageTransition>
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-24 text-center">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        className="relative isolate flex aspect-[16/9] w-full max-w-xl select-none items-center justify-center overflow-hidden rounded-card border border-line-strong bg-ink shadow-card-hover"
      >
        <span
          aria-hidden
          className="font-serif text-[clamp(5rem,16vw,10rem)] font-semibold leading-none tracking-tight text-paper/10"
        >
          404
        </span>
        <motion.h1
          aria-hidden
          style={enabled ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
          className={`absolute font-serif text-[clamp(5rem,16vw,10rem)] font-semibold leading-none tracking-tight ${
            enabled ? "text-paper" : "text-paper/90"
          }`}
        >
          404
        </motion.h1>
      </motion.div>

      <h1 className="mt-10 font-serif text-3xl font-semibold tracking-tight text-ink text-balance">
        This page has been misplaced
      </h1>
      <p className="mx-auto mt-3 max-w-sm font-serif text-[1.0625rem] leading-relaxed text-ink-muted">
        The shelf you were looking for is empty, or the address was written
        down wrong. Either way, the ink is still dry here.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" transitionTypes={["nav-back"]} className="btn-primary px-6 py-3">
          Back home
        </Link>
        <Link href="/posts" transitionTypes={["nav-forward"]} className="btn-ghost px-6 py-3">
          Browse posts
        </Link>
      </div>
      </main>
    </PageTransition>
  );
}
