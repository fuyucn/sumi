"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

interface Tab {
  href: string;
  active: boolean;
  label: string;
}

/** Writing dashboard scope switcher. The active tab's underline slides
 *  between positions (motivated state transition); reduced-motion renders
 *  a static underline instead. */
export function WriteTabs({ tabs }: { tabs: Tab[] }) {
  const reduce = useReducedMotion();
  return (
    <nav className="mb-4 flex items-end gap-1 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`relative -mb-px border-b-2 px-3 pb-2.5 text-sm transition-colors ${
            tab.active
              ? "border-seal font-medium text-ink"
              : "border-transparent text-ink-faint hover:text-ink-muted"
          }`}
        >
          {tab.label}
          {tab.active && !reduce ? (
            <motion.span
              layoutId="write-tab-underline"
              className="absolute inset-x-0 -bottom-[2px] h-0.5 rounded-full bg-seal"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
