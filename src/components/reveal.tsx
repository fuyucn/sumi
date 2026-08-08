"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "ol" | "ul" | "li";
}) {
  const reduce = useReducedMotion();
  const Comp =
    as === "section"
      ? motion.section
      : as === "ol"
        ? motion.ol
        : as === "ul"
          ? motion.ul
          : as === "li"
            ? motion.li
            : motion.div;

  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}
