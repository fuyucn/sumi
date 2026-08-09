"use client";
import { motion, useReducedMotion } from "motion/react";

/**
 * Editorial bookmark: the cinnabar hairline draws top-to-bottom as the card
 * enters the viewport, then deepens on hover. Parent must be a Tailwind
 * `group` so the hover state works.
 */
export function CardRule({ delay = 0 }: { delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      initial={reduce ? false : { scaleY: 0 }}
      whileInView={reduce ? undefined : { scaleY: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: "top" }}
      className="pointer-events-none absolute inset-y-6 left-0 hidden w-[2px] rounded-full bg-seal/45 transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:bg-seal md:block"
    />
  );
}
