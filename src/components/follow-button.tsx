"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toggleFollowAction } from "@/app/community/actions";

export function FollowButton({
  handle,
  initialCount,
  initialFollowing,
}: {
  handle: string;
  initialCount: number;
  initialFollowing: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();

  async function onClick() {
    if (busy) return;
    const prev = { following, count };
    setFollowing(!following);
    setCount(count + (following ? -1 : 1));
    setBusy(true);
    const res = await toggleFollowAction({ followee: handle });
    setBusy(false);
    if (!res.ok) {
      setFollowing(prev.following);
      setCount(prev.count);
    } else {
      setFollowing(res.data.following);
      setCount(res.data.count);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={following}
      aria-label={following ? `Unfollow @${handle}` : `Follow @${handle}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        following
          ? "border-line-strong bg-ink text-paper hover:bg-ink/90"
          : "border-seal bg-seal text-paper hover:bg-seal/90"
      }`}
    >
      <span className="relative inline-flex overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={following ? "following" : "follow"}
            className="inline-flex"
            initial={reduce ? false : { y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -8, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {following ? "Following" : "Follow"}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-xs opacity-80">{count}</span>
    </button>
  );
}
