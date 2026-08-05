"use client";

import { useState } from "react";
import { toggleLikeAction } from "@/app/community/actions";

export function LikeButton({
  postHandle,
  slug,
  initialCount,
  initialLiked,
}: {
  postHandle: string;
  slug: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    setBusy(true);
    const res = await toggleLikeAction({ postHandle, slug });
    setBusy(false);
    if (!res.ok) {
      setLiked(prevLiked);
      setCount(prevCount);
    } else {
      setLiked(res.data.liked);
      setCount(res.data.count);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this post" : "Like this post"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        liked
          ? "border-seal bg-seal/10 text-seal"
          : "border-line-strong text-ink-muted hover:border-seal hover:text-seal"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
