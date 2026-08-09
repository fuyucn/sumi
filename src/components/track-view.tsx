"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "@phosphor-icons/react/dist/ssr";
import { trackPostViewAction } from "@/app/[handle]/[slug]/actions";

/**
 * Reports a single view for the current article (once per mount) and shows
 * the live view count in the byline. Stays static until the client hydrates,
 * so the SSR HTML never increments the counter.
 */
export function TrackView({
  handle,
  slug,
  initialViews,
  className = "",
}: {
  handle: string;
  slug: string;
  initialViews?: number;
  className?: string;
}) {
  const [views, setViews] = useState<number | undefined>(initialViews);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void trackPostViewAction(handle, slug)
      .then(setViews)
      .catch(() => {});
  }, [handle, slug]);

  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}>
      <Eye size={12} weight="duotone" aria-hidden />
      {views?.toLocaleString("en-US") ?? "–"} {views === 1 ? "view" : "views"}
    </span>
  );
}
