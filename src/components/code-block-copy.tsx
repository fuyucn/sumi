"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

/**
 * Floating copy button for Shiki code blocks. When the clipboard API is
 * unavailable (non-secure context) the click is a silent no-op and the code
 * stays selectable by hand; a brief "Copied" state mirrors the form success
 * language used across the site.
 */
export function CodeBlockCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied code" : "Copy code"}
      title={copied ? "Copied" : "Copy code"}
      className={`press absolute right-3 top-2.5 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors duration-200 ${
        copied
          ? "border-seal/50 bg-seal/10 text-seal"
          : "border-line-strong bg-paper/85 text-ink-faint backdrop-blur-sm hover:border-seal hover:text-seal"
      }`}
    >
      {copied ? (
        <span
          className="inline-flex items-center gap-1"
          style={{ animation: "fade-in 0.22s var(--ease-out)" }}
        >
          <Check size={12} weight="bold" aria-hidden />
          Copied
        </span>
      ) : (
        <>
          <Copy size={12} weight="duotone" aria-hidden />
          Copy
        </>
      )}
    </button>
  );
}
