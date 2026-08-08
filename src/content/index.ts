import { env } from "@/lib/env";
import type { ContentStore } from "./store";
import type { AiStore } from "./ai-store";

export type { ContentStore } from "./store";
export type { AiStore, AiProviderConfig, AiTask, AiSummaryResult } from "./ai-store";

/**
 * Build the Postgres mirror content store (DbContentStore) when `DB_MIRROR=1`
 * and a DATABASE_URL is configured. Returns null when the mirror is disabled.
 * Cached per process: `createDb` opens one connection and never closes it, so
 * building a store per request would exhaust the database's connection budget.
 */
let _dbContentStore: ContentStore | null | undefined;
export async function getDbContentStore(): Promise<ContentStore | null> {
  if (!env.DB_MIRROR) return null;
  if (_dbContentStore !== undefined) return _dbContentStore;
  const { createDb } = await import("@/lib/db");
  const { DbContentStore } = await import("./db-content-store");
  _dbContentStore = new DbContentStore(createDb(env.DATABASE_URL) as never);
  return _dbContentStore;
}

/**
 * Build the Cloudflare content store (D1 + R2) when running on Cloudflare and
 * `CF_ENABLED=1`. Returns null when the CF runtime isn't available, so callers
 * can fall back to the Postgres store (Docker/VPS keep working).
 */
export async function getCloudflareContentStore(): Promise<ContentStore | null> {
  if (!env.CF_ENABLED) return null;
  try {
    const [{ getCloudflareContext }, { CloudflareContentStore }] = await Promise.all([
      import("@opennextjs/cloudflare"),
      import("./cloudflare-content-store"),
    ]);
    const ctx = getCloudflareContext();
    const { DB, IMAGES } = ctx.env as { DB?: unknown; IMAGES?: unknown };
    if (!DB) return null;
    return new CloudflareContentStore(DB as never, IMAGES as never);
  } catch {
    // Not running on Cloudflare (e.g. local Node, Docker, VPS) — caller falls back.
    return null;
  }
}

/** Build the content store for a signed-in user. Null if no backend is configured. */
export async function getContentStoreForUser(_userId: string): Promise<ContentStore | null> {
  const cf = await getCloudflareContentStore();
  if (cf) return cf;
  return getDbContentStore();
}

/**
 * Build the content store for an autonomous agent. Agents have no browser OAuth
 * session, so this uses the configured service backend directly:
 * Cloudflare D1 → Postgres mirror (DB_MIRROR=1). Null if no backend is configured.
 */
export async function getAgentContentStore(): Promise<ContentStore | null> {
  const cf = await getCloudflareContentStore();
  if (cf) return cf;
  return getDbContentStore();
}

/**
 * Build the AI store (provider config + summary tasks) on the Postgres mirror.
 * Null when the mirror is disabled, so the feature degrades gracefully on the
 * GitHub / Cloudflare D1 backends. Cached per process like getDbContentStore.
 */
let _aiStore: AiStore | null | undefined;
export async function getAiStore(): Promise<AiStore | null> {
  if (!env.DB_MIRROR) return null;
  if (_aiStore !== undefined) return _aiStore;
  const { createDb } = await import("@/lib/db");
  const { DbAiStore } = await import("./db-ai-store");
  _aiStore = new DbAiStore(createDb(env.DATABASE_URL) as never);
  return _aiStore;
}

/** A content store for PUBLIC reads (no signed-in user needed). Null if none configured. */
export async function getReadContentStore(): Promise<ContentStore | null> {
  const cf = await getCloudflareContentStore();
  if (cf) return cf;
  return getDbContentStore();
}
