"use client";
import { useEffect, useRef, useState } from "react";
import type { AiTask } from "@/content/ai-store";

interface Props {
  handle: string;
  slug: string;
  initialTask: AiTask | null;
  /** Heading anchor slugs present in the rendered article body. */
  headings?: string[];
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

export function AiSummaryPanel({ handle, slug, initialTask, headings = [] }: Props) {
  const [task, setTask] = useState<AiTask | null>(initialTask);
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
            setTask((t) => (t ? { ...t, status: "failed", error: "生成超时：请回到编辑页点击「重新生成」" } : t));
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

  if (!task) return null;

  const busy = task.status === "pending" || task.status === "running";

  return (
    <section
      aria-label="AI 总结"
      className="mt-8 rounded-card border border-line bg-paper/60 p-5 sm:p-6 shadow-card"
    >
      <div className="flex items-center gap-2">
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
            {task.error ? <span className="mt-1 block font-mono text-xs text-ink-faint">{task.error}</span> : null}
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
