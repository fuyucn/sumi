"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** True when focus sits in an editable element; shortcuts must not hijack typing. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/** Set right before a shortcut navigation; consumed once the search page mounts. */
let pendingFocus = false;

/** Cmd/Ctrl+K jumps to Search from anywhere; "/" focuses the search box. */
export function SearchShortcut() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/search" && pendingFocus) {
      pendingFocus = false;
      const id = requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>('input[name="q"]')?.focus(),
      );
      return () => cancelAnimationFrame(id);
    }
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (pathname === "/search") {
          document.querySelector<HTMLInputElement>('input[name="q"]')?.focus();
        } else {
          pendingFocus = true;
          router.push("/search");
        }
        return;
      }
      if (e.key === "/" && !isEditable(e.target)) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (input) input.focus();
        else {
          pendingFocus = true;
          router.push("/search");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return null;
}
