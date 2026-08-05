/**
 * In-memory registry of MCP sessions for the Streamable HTTP server.
 *
 * Kept separate from the route so the TTL / capacity behaviour can be unit
 * tested without a live transport. A session holds whatever the caller needs
 * (e.g. an open `WebStandardStreamableHTTPServerTransport`) plus the epoch-ms
 * of its last request; eviction closes and removes stale or surplus entries.
 */

export interface TrackedSession {
  /** Epoch ms of the last request that touched this session. */
  lastActiveAt: number;
  /** Release the underlying connection (transport.close()). Called once per eviction. */
  close(): Promise<void> | void;
}

/** Idle sessions are dropped after this long (a client that never sends DELETE). */
export const SESSION_TTL_MS = 30 * 60 * 1000;
/** Hard cap on concurrent sessions to bound memory in a long-running server. */
export const MAX_SESSIONS = 64;

export const registry = new Map<string, TrackedSession>();

/** Record that a session was just used. No-op for unknown ids. */
export function touch(id: string, now = Date.now()): void {
  const session = registry.get(id);
  if (session) session.lastActiveAt = now;
}

/** Close and remove a single session. Safe to call more than once. */
export function drop(id: string): void {
  const session = registry.get(id);
  if (!session) return;
  registry.delete(id);
  void session.close();
}

/**
 * Remove expired sessions; if still over the cap after that, evict the
 * oldest-idle sessions to make room for one new session.
 */
export function makeCapacity(now = Date.now()): void {
  for (const [id, session] of registry) {
    if (now - session.lastActiveAt > SESSION_TTL_MS) drop(id);
  }
  if (registry.size < MAX_SESSIONS) return;

  const byIdle = [...registry.entries()].sort((a, b) => a[1].lastActiveAt - b[1].lastActiveAt);
  const overflow = registry.size - (MAX_SESSIONS - 1);
  for (const [id] of byIdle.slice(0, overflow)) drop(id);
}
