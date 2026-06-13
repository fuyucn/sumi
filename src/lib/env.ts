import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  // comma-separated GitHub logins; empty => deny all (enforced in allowlist.ts)
  ALLOWED_GITHUB_USERS: z.string().default(""),
  // Optional until Plan 2 (content engine via GitHub API) actually uses it, so a
  // Plan 1-only deployment doesn't fail on first request. When present it must be owner/repo.
  GITHUB_CONTENT_REPO: z.string().regex(/^[^/]+\/[^/]+$/, "must be owner/repo").optional(),
  // Optional read token for server-side public reads of the content repo.
  // If absent, reads use unauthenticated Octokit (works for public repos).
  GITHUB_CONTENT_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return schema.parse(source);
}

// Lazy singleton: importing this module must NOT eagerly parse process.env
// (tests import `loadEnv` directly). Parsed on first property access.
let _env: Env | undefined;
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    _env ??= loadEnv();
    return _env[prop as keyof Env];
  },
});
