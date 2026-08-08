"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/**
 * Resolves a handle to its public display name (displayName when set, else
 * `@handle`). Used by client components that can't query the content store.
 * The result is cached per handle for the lifetime of the page.
 */
export function useDisplayName(handle: string | undefined | null): string {
  const [name, setName] = useState<string>(() =>
    handle ? cache.get(handle) ?? "" : "",
  );

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    const cached = cache.get(handle);
    if (cached) {
      // Defer the cache-hit update so we never set state synchronously in the
      // effect body (avoids a cascading re-render on mount).
      Promise.resolve().then(() => {
        if (!cancelled) setName(cached);
      });
      return () => {
        cancelled = true;
      };
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

  return name || (handle ? `@${handle}` : "");
}
