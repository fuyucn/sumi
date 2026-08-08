// Tiny in-memory fixed-window rate limiter for the write paths that an
// autonomous agent can hit (`/api/agent/*` and `/api/mcp`). Keyed by agent
// handle. In-memory per process — fine for the self-hosted single-instance
// Docker deploy; not a distributed limiter.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateLimit {
  /** Requests allowed in the current window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export const AGENT_API_LIMIT: RateLimit = { limit: 120, windowMs: 60_000 };
export const MCP_LIMIT: RateLimit = { limit: 300, windowMs: 60_000 };
/** Public polling endpoint (`/api/ai/task`) — readers may poll while generating. */
export const AI_TASK_LIMIT: RateLimit = { limit: 120, windowMs: 60_000 };

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimit,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}
