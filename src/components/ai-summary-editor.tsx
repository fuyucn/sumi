"use client";
import { useMemo, useState } from "react";
import type { AiTask } from "@/content/ai-store";
import type { HeadingInfo } from "@/lib/heading-slug";
import { extractHeadings } from "@/lib/heading-slug";
import { generateSummaryAction } from "@/app/write/actions";

interface Props {
  slug: string;
  /** Current editor body — generated from the latest content even before saving. */
  body: string;
  /** While editing an agent post, read/generate the task under this handle. */
  sourceHandle?: string;
  initialTask?: AiTask | null;
  headings?: HeadingInfo[];
}

export function AiSummaryEditor({ slug, body, sourceHandle, initialTask = null, headings = [] }: Props) {
  const [task, setTask] = useState<AiTask | null>(initialTask);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefer headings from the live editor body (what the LLM actually saw);
  // fall back to the prop from the last saved post.
  const headingBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of [...extractHeadings(body), ...headings]) {
      if (!map.has(h.slug)) map.set(h.slug, h.text);
    }
    return map;
  }, [body, headings]);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await generateSummaryAction(slug, body, sourceHandle);
    setBusy(false);
    if (result.ok) {
      setTask(result.task);
    } else {
      setError(result.error);
      setTask((t) => (t ? { ...t, status: "failed", error: result.error, result: null } : t));
    }
  }

  const done = task?.status === "done" && task.result !== null;
  const failed = task?.status === "failed" || error !== null;
  const busyNow = busy || task?.status === "pending" || task?.status === "running";

  return (
    <section
      aria-label="AI 导读"
      className="mt-8 rounded-card border border-line bg-paper/60 p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">AI 导读 · 共读</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            基于当前正文一键生成导读；生成的要点会自动带上文章小标题的跳转锚点
          </p>
        </div>
        {task?.model ? (
          <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] text-ink-faint">
            {task.model}
          </span>
        ) : null}
      </div>

      {done && task.result ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="font-serif text-[1.02rem] leading-relaxed text-ink">{task.result.tldr}</p>
          <ul className="mt-3 space-y-2">
            {task.result.points.map((point, i) => {
              const section = point.anchor ? headingBySlug.get(point.anchor) : undefined;
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-muted">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-seal" />
                  <span>
                    {point.anchor && section ? (
                      <a
                        href={`#${point.anchor}`}
                        className="font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-seal"
                      >
                        {point.text}
                      </a>
                    ) : (
                      point.text
                    )}
                    {point.anchor && section ? (
                      <a
                        href={`#${point.anchor}`}
                        className="ml-2 inline-block rounded-full border border-seal/30 bg-seal/[0.06] px-2 py-0.5 text-[10px] font-medium tracking-wide text-seal transition-colors hover:border-seal hover:text-ink"
                      >
                        → {section}
                      </a>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : busyNow ? (
        <div className="mt-4 space-y-3 border-t border-line pt-4" aria-hidden>
          <div className="h-4 w-11/12 animate-pulse rounded bg-line-strong/50" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-line-strong/50" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-line-strong/40" />
        </div>
      ) : failed ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            生成失败
            {task?.error ? (
              <span className="mt-1 block font-mono text-xs break-all text-ink-faint">{task.error}</span>
            ) : null}
            {error ? <span className="mt-1 block text-xs text-seal">{error}</span> : null}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <button type="button" onClick={generate} disabled={busyNow} className="btn-primary px-5 text-sm">
          {busyNow ? "生成中…" : done ? "重新生成" : "一键生成 AI 导读"}
        </button>
        {!done && !busyNow && !failed ? (
          <p className="text-xs text-ink-faint">需要先保存过一次草稿/文章</p>
        ) : null}
        {failed && !busyNow ? (
          <p className="text-xs text-ink-faint">检查 Settings → AI 导读 的配置后可重试</p>
        ) : null}
      </div>
    </section>
  );
}
