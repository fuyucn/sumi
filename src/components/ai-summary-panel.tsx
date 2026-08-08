"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AiTask } from "@/content/ai-store";
import { clearSummaryAction, generateSummaryAction } from "@/app/write/actions";
import { friendlyAiError, KEY_RE } from "@/lib/ai/error-hint";

interface Props {
  handle: string;
  slug: string;
  initialTask: AiTask | null;
  /** Heading anchor slugs present in the rendered article body. */
  headings?: string[];
  /** Signed-in author viewing their own post: allow regenerate from the page. */
  isAuthor?: boolean;
}

/** Max polling attempts before showing a timeout hint (generation is manual). */
const MAX_POLLS = 20;

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-3.5 animate-pulse rounded-full border border-seal/50 bg-seal/20"
    />
  );
}

export function AiSummaryPanel({ handle, slug, initialTask, headings = [], isAuthor = false }: Props) {
  const [task, setTask] = useState<AiTask | null>(initialTask);
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!task || (task.status !== "pending" && task.status !== "running")) return;
    let attempts = 0;
    timer.current = setInterval(async () => {
      try {
        attempts += 1;
        const res = await fetch(`/api/ai/task?handle=${encodeURIComponent(handle)}&slug=${encodeURIComponent(slug)}`);
        const data = (await res.json()) as { ok: boolean; task: AiTask | null };
        if (!data.ok || !data.task) return;
        if (data.task.status === "pending" || data.task.status === "running") {
          if (attempts >= MAX_POLLS) {
            if (timer.current) clearInterval(timer.current);
            setTask((t) => (t ? { ...t, status: "failed", error: "生成超时：可稍后点击「重新生成」" } : t));
          }
        } else {
          if (timer.current) clearInterval(timer.current);
          setTask(data.task);
        }
      } catch {
        // keep polling; transient network errors are fine
      }
    }, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [task, handle, slug]);

  async function regenerate() {
    if (generating || busy) return;
    setGenerating(true);
    // isAuthor means the signed-in user owns this post: no sourceHandle, so the
    // action runs under the user's own handle and backfills the excerpt (导读).
    const result = await generateSummaryAction(slug);
    setGenerating(false);
    if (result.ok) {
      setTask(result.task);
    } else {
      setTask((t) => (t ? { ...t, status: "failed", error: result.error, result: null } : t));
    }
  }

  async function clear() {
    if (generating || busy) return;
    setGenerating(true);
    const result = await clearSummaryAction(slug);
    setGenerating(false);
    if (result.ok) {
      setTask(null);
    }
  }

  if (!task) {
    if (!isAuthor) return null;
    return (
      <section
        aria-label="AI 总结"
        className="mt-8 rounded-card border border-line bg-paper/60 p-5 sm:p-6 shadow-card"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-seal/40 bg-seal/10 px-2.5 py-0.5 text-xs font-medium tracking-wide text-seal">
            AI 总结
          </span>
          <button
            type="button"
            onClick={regenerate}
            disabled={generating}
            className="press ml-auto rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-seal hover:text-seal disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "生成中…" : "生成 AI 总结"}
          </button>
        </div>
        <p className="mt-3 text-sm text-ink-faint">
          还没有 AI 总结，点击「生成 AI 总结」用当前正文生成。
        </p>
      </section>
    );
  }

  const busy = task.status === "pending" || task.status === "running";

  return (
    <section
      aria-label="AI 总结"
      className="mt-8 rounded-card border border-line bg-paper/60 p-5 sm:p-6 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-seal/40 bg-seal/10 px-2.5 py-0.5 text-xs font-medium tracking-wide text-seal">
          AI 总结
        </span>
        {busy ? (
          <span className="flex items-center gap-2 text-xs text-ink-faint">
            <Spinner />
            正在生成，通常需要几秒
          </span>
        ) : task.model ? (
          <span className="text-xs text-ink-faint">{task.model}</span>
        ) : null}
        {isAuthor ? (
          <span className="ml-auto flex items-center gap-2">
            {task.status === "done" || task.status === "failed" ? (
              <button
                type="button"
                onClick={clear}
                disabled={generating || busy}
                className="press rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-faint transition-colors hover:border-seal hover:text-seal disabled:cursor-not-allowed disabled:opacity-50"
              >
                清除
              </button>
            ) : null}
            <button
              type="button"
              onClick={regenerate}
              disabled={generating || busy}
              className="press rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-seal hover:text-seal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "生成中…" : task ? "重新生成" : "生成 AI 总结"}
            </button>
          </span>
        ) : null}
      </div>

      {task.status === "done" && task.result ? (
        <div key={task.finishedAt ?? "done"} className="panel-enter mt-4">
          {task.result.summary ? (
            <p className="font-serif text-[1.0625rem] leading-relaxed text-ink">
              {task.result.summary}
            </p>
          ) : null}

          <div className="mt-4 rounded-r-lg border-l-2 border-seal bg-seal-wash/40 px-4 py-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-seal">
              TL;DR
            </p>
            <p className="mt-1 font-serif text-sm leading-relaxed text-ink">
              {task.result.tldr}
            </p>
          </div>

          {task.result.points.length > 0 ? (
            <div className="mt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Key points
              </p>
              <ul className="mt-2.5 space-y-2">
                {task.result.points.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-muted">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-seal" />
                    {point.anchor && headings.includes(point.anchor) ? (
                      <a
                        href={`#${point.anchor}`}
                        className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
                      >
                        {point.text}
                      </a>
                    ) : (
                      point.text
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : task.status === "failed" ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            AI 总结生成失败
            {task.error ? (
              <span className="mt-1 block text-xs text-seal">{friendlyAiError(task.error)}</span>
            ) : null}
            {isAuthor && KEY_RE.test(task.error ?? "") ? (
              <Link
                href="/settings"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-seal underline-offset-4 transition-colors hover:text-seal-soft hover:underline"
              >
                去 Settings 更新 API Key →
              </Link>
            ) : null}
          </p>
        </div>
      ) : busy ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <div className="shimmer h-4 w-11/12 rounded bg-line-strong/40" />
          <div className="shimmer h-4 w-4/6 rounded bg-line-strong/40" />
          <div className="shimmer h-3 w-5/6 rounded bg-line-strong/30" />
          <div className="shimmer h-3 w-3/5 rounded bg-line-strong/30" />
        </div>
      ) : null}
    </section>
  );
}
