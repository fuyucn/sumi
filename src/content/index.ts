import { githubClientFromToken, readGitHubClient } from "@/lib/github";
import { env } from "@/lib/env";
import { getGithubToken } from "./github-token";
import { GitHubContentStore } from "./github-content-store";
import type { ContentStore } from "./store";

export type { ContentStore } from "./store";
export { GitHubContentStore } from "./github-content-store";

/** Build a content store from an explicit token + repo (no I/O). */
export function buildContentStore(token: string, repo: string): ContentStore {
  return new GitHubContentStore(githubClientFromToken(token, repo));
}

/**
 * Build the Postgres mirror content store (DbContentStore) when `DB_MIRROR=1`
 * and a DATABASE_URL is configured. Returns null when the mirror is disabled.
 */
export async function getDbContentStore(): Promise<ContentStore | null> {
  if (!env.DB_MIRROR) return null;
  const { createDb } = await import("@/lib/db");
  const { DbContentStore } = await import("./db-content-store");
  return new DbContentStore(createDb(env.DATABASE_URL) as never);
}

/**
 * Build the Cloudflare content store (D1 + R2) when running on Cloudflare and
 * `CF_ENABLED=1`. Returns null when the CF runtime isn't available, so callers
 * can fall back to the GitHub-backed store (Docker/VPS keep working).
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
export async function getContentStoreForUser(userId: string): Promise<ContentStore | null> {
  const cf = await getCloudflareContentStore();
  if (cf) return cf;
  const db = await getDbContentStore();
  if (db) return db;
  const token = await getGithubToken(userId);
  const repo = env.GITHUB_CONTENT_REPO;
  if (!token || !repo) return null;
  return buildContentStore(token, repo);
}

/**
 * Build the content store for an autonomous agent. Agents have no browser OAuth
 * session, so this uses the configured service backend directly:
 * Cloudflare D1 → Postgres mirror (DB_MIRROR=1) → GitHub (requires a
 * WRITE-capable GITHUB_CONTENT_TOKEN). Null if no backend is configured.
 */
export async function getAgentContentStore(): Promise<ContentStore | null> {
  const cf = await getCloudflareContentStore();
  if (cf) return cf;
  const db = await getDbContentStore();
  if (db) return db;
  const repo = env.GITHUB_CONTENT_REPO;
  const token = env.GITHUB_CONTENT_TOKEN;
  if (!repo) return null;
  return buildContentStore(token ?? "", repo);
}

/** A content store for PUBLIC reads (no signed-in user needed). Null if none configured. */
export async function getReadContentStore(): Promise<ContentStore | null> {
  const cf = await getCloudflareContentStore();
  if (cf) return cf;
  const db = await getDbContentStore();
  if (db) return db;
  const repo = env.GITHUB_CONTENT_REPO;
  if (!repo) return null;
  return new GitHubContentStore(readGitHubClient(repo, env.GITHUB_CONTENT_TOKEN));
}
