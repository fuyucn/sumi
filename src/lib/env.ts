import { z } from "zod";

// .env files commonly leave optional keys present-but-blank (e.g. `FOO=`).
// Treat an empty string as "not set" so optional fields don't fail validation.
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const schema = z.object({
  DATABASE_URL: z.string().url().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  // comma-separated GitHub logins; empty => deny all (enforced in allowlist.ts)
  ALLOWED_GITHUB_USERS: z.string().default(""),
  // Optional Cloudflare runtime flag. OpenNext injects CF bindings (D1/R2) via
  // the worker env at runtime, NOT as process.env vars, so this is purely a
  // hint for the ContentStore factory to select the Cloudflare backend over the
  // Postgres one. Empty string (common in .env files) disables it.
  CF_ENABLED: z.preprocess(emptyToUndefined, z.string().optional()),
  // Postgres-first content storage flag. When set (e.g. "1"), all content
  // reads/writes/search are served from the `sumi_*` Postgres tables
  // (DbContentStore).
  DB_MIRROR: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.parse(source);
  // Fail fast instead of silently locking the owner out: an empty allowlist
  // denies every GitHub login, which is only ever a misconfiguration in prod.
  if (source.NODE_ENV === "production" && !parsed.ALLOWED_GITHUB_USERS.trim()) {
    throw new Error(
      "ALLOWED_GITHUB_USERS is empty in production: no GitHub account would be able to sign in. " +
        "Set it to a comma-separated list of allowed GitHub logins (e.g. 'fuyucn') and redeploy.",
    );
  }
  return parsed;
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
