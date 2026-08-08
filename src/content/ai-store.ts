// AI provider config + summary tasks (Postgres mirror backend).
//
// Kept as a separate small interface (not part of ContentStore) so backends
// without the mirror tables (Cloudflare D1) can simply return null from
// `getAiStore()` and the feature degrades gracefully (no AI panel, no settings
// section).

export type AiTaskStatus = "pending" | "running" | "done" | "failed";

export interface AiProviderConfig {
  handle: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

/** One bullet of an AI 总结. `anchor` is the article heading slug the point links to. */
export interface AiSummaryPoint {
  text: string;
  anchor?: string;
}

/** Parsed LLM output for a summary task. */
export interface AiSummaryResult {
  /** 一段式完整总结（可选，旧任务可能没有）。 */
  summary?: string;
  tldr: string;
  points: AiSummaryPoint[];
}

export interface AiTask {
  id: string;
  handle: string;
  postHandle: string;
  postSlug: string;
  kind: string;
  status: AiTaskStatus;
  result: AiSummaryResult | null;
  error: string | null;
  model: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AiStore {
  getProvider(handle: string): Promise<AiProviderConfig | null>;
  saveProvider(provider: AiProviderConfig, now: Date): Promise<void>;
  /** Latest task for a post, or null. */
  getTask(handle: string, postSlug: string): Promise<AiTask | null>;
  /** Enqueue a summary task for a post (deduped: no-op when one exists). */
  enqueueSummary(handle: string, postSlug: string, now: Date): Promise<void>;
  /** Atomically claim up to `limit` pending tasks (pending -> running). */
  claimPending(limit: number, now: Date): Promise<AiTask[]>;
  /** Record a finished task (done or failed). */
  finishTask(
    id: string,
    input: { status: AiTaskStatus; result?: AiSummaryResult | null; error?: string | null; model?: string | null; now: Date },
  ): Promise<void>;
  /** Reset a task so the author can regenerate (failed/pending -> pending). */
  resetTask(handle: string, postSlug: string, now: Date): Promise<void>;
  /** Delete a task (and its stored result) for a post. */
  deleteTask(handle: string, postSlug: string): Promise<void>;
}
