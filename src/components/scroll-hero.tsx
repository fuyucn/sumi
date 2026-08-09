"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * The home hero leans back as the reader scrolls: it fades, compresses
 * slightly, and drifts upward before the feed takes over. Enabled only
 * after mount (SSR and first paint match the static section), and skipped
 * entirely for reduced-motion users.
 */
export function ScrollHero({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0.25]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.98]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -12]);

  useEffect(() => {
    // Reading the reduced-motion preference is a client-only side effect;
    // the values land after mount so SSR and first paint agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(!reduce);
  }, [reduce]);

  return (
    <motion.section
      ref={ref}
      style={enabled ? { opacity, scale, y } : undefined}
      className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16"
    >
      {children}
    </motion.section>
  );
}
