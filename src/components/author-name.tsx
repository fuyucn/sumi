"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/**
 * Resolves a handle to its public display name (displayName when set, else
 * `@handle`). Used in client components that can't query the content store.
 */
export function AuthorName({
  handle,
  className,
}: {
  handle: string;
  className?: string;
}) {
  const [name, setName] = useState<string>(() => cache.get(handle) ?? "");

  useEffect(() => {
    let cancelled = false;
    if (cache.has(handle)) {
      setName(cache.get(handle)!);
      return;
    }
    fetch(`/api/profile?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((j) => {
        const n = j?.profile?.displayName?.trim() || `@${handle}`;
        cache.set(handle, n);
        if (!cancelled) setName(n);
      })
      .catch(() => {
        if (!cancelled) setName(`@${handle}`);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return <span className={className}>{name || `@${handle}`}</span>;
}
