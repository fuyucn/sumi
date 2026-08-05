"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface DraftData {
  title: string;
  tags: string[];
  body: string;
  savedAt: string;
}

const keyFor = (base: string) => `sumi:draft:${base}`;

export function readDraft(key: string): DraftData | null {
  const raw = localStorage.getItem(keyFor(key));
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<DraftData>;
    if (d && typeof d.body === "string") return d as DraftData;
    return null;
  } catch {
    return null;
  }
}

/**
 * Client-side autosave safety net: debounces the working draft into
 * localStorage under `sumi:draft:<key>`, recovers it on mount, and exposes a
 * `clear()` for when the draft is persisted to the server (save/publish).
 *
 * Only writes once the user has actually edited (`dirty`), so opening an
 * untouched post never mints a spurious local copy. Debounce gives 1.2s of
 * trailing space per keystroke.
 */
export function useDraftAutosave(opts: {
  key: string;
  state: DraftData;
  dirty: boolean;
  onRecover: (draft: DraftData) => void;
}) {
  const { key, state, dirty, onRecover } = opts;
  const recoveredRef = useRef(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Recover a previous autosave once, before the user starts typing.
  useEffect(() => {
    if (recoveredRef.current) return;
    recoveredRef.current = true;
    const draft = readDraft(key);
    if (draft) onRecover(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced autosave — only after real edits.
  const { title, tags, body } = state;
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      const at = new Date().toISOString();
      localStorage.setItem(keyFor(key), JSON.stringify({ title, tags, body, savedAt: at }));
      setSavedAt(at);
    }, 1200);
    return () => clearTimeout(t);
  }, [key, title, tags, body, dirty]);

  const clear = useCallback(() => {
    localStorage.removeItem(keyFor(key));
    setSavedAt(null);
  }, [key]);

  return { savedAt, clear };
}