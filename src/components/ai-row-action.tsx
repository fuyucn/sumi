"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearSummaryAction, generateSummaryAction } from "@/app/write/actions";

export type AiRowStatus = "done" | "failed" | "running" | null;

export function AiRowAction({
  handle,
  slug,
  isAgent,
  status,
}: {
  handle: string;
  slug: string;
  isAgent: boolean;
  status: AiRowStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceHandle = isAgent ? handle : undefined;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await generateSummaryAction(slug, undefined, sourceHandle);
    setBusy(false);
    if (r.ok) {
      router.refresh();
    } else {
      setError(r.error);
    }
  }

  async function clear() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await clearSummaryAction(slug, sourceHandle);
    setBusy(false);
    if (r.ok) {
      router.refresh();
    } else {
      setError(r.error);
    }
  }

  const running = busy || status === "running";
  const label =
    busy || status === "running"
      ? "AI 生成中…"
      : status === "done"
        ? "AI 总结 ✓"
        : status === "failed"
          ? "AI 重试"
          : "AI 总结";
  const tone =
    status === "done" && !running
      ? "border-seal/40 bg-seal/10 text-seal"
      : status === "failed" && !running
        ? "border-line-strong text-ink-muted hover:border-seal hover:text-seal"
        : "border-line text-ink-faint hover:border-seal hover:text-seal";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={generate}
        disabled={running}
        title={error ?? (status === "done" ? "重新生成 AI 总结" : "一键生成 AI 总结")}
        className={`press rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${tone}`}
      >
        {running ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-seal" />
            {label}
          </span>
        ) : (
          label
        )}
      </button>
      {status === "done" && !running ? (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-ink-faint transition-colors hover:text-seal"
          title="清除 AI 总结"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
