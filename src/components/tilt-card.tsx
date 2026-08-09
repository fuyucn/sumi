"use client";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * Subtle 3D tilt for a card: it leans toward the cursor with a soft glare
 * that follows the pointer. Only enables on hover-capable, fine-pointer
 * devices after mount; touch and reduced-motion users get the plain card
 * (identical to the server render, so hydration stays stable).
 */
export function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 170, damping: 18, mass: 0.4 };
  const rotateX = useSpring(useTransform(py, [0, 1], [4, -4]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-4, 4]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    // Reading a media query is a client-only side effect; the initial value
    // must land after mount so SSR and first paint agree on the plain card.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setEnabled(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [reduce]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
    setHovered(false);
  };

  if (!enabled || reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-card"
      >
        <motion.span
          aria-hidden
          className="absolute block h-44 w-44 rounded-full bg-white/[0.09] blur-2xl"
          style={{ left: glareX, top: glareY, x: "-50%", y: "-50%" }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.span>
    </motion.div>
  );
}
