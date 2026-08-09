"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "@phosphor-icons/react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";

const SHOW_AFTER = 560;
// The reading-progress pill (bottom-right) only renders on article pages
// (`/@handle/slug`); lift above it there instead of colliding.
const ARTICLE_PAGE = /^\/@[^/]+\/[^/]+$/;

/** Floating back-to-top button. Appears after a long scroll, exits with a
 * quick rise, and respects reduced-motion for the smooth jump. */
export function ScrollTop() {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  // Initialize from the restored scroll position: browsers may restore the
  // scroll offset before the first change event, so read it explicitly.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(window.scrollY > SHOW_AFTER);
  }, []);
  useMotionValueEvent(scrollY, "change", (v) => setVisible(v > SHOW_AFTER));

  // Only rendered while visible (client-side), so reading the pathname here
  // cannot diverge from the server's initial null.
  const isArticle = ARTICLE_PAGE.test(pathname);
  const goTop = () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={goTop}
          aria-label="Back to top"
          initial={reduce ? false : { opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`press group fixed right-5 z-[35] grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-paper/95 text-ink-faint shadow-card backdrop-blur-md transition-colors duration-[var(--dur-short)] hover:border-seal/40 hover:text-seal ${
            isArticle ? "bottom-24" : "bottom-6"
          }`}
        >
          <ArrowUp size={16} weight="duotone" aria-hidden />
          <span
            role="tooltip"
            className="nav-tooltip pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-paper shadow-pop"
          >
            Back to top
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
