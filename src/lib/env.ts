import { z } from "zod";

const schema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_FILE: z.string().min(1).default("./data/sumi.db"),
  SIGNUPS: z.enum(["open", "invite", "closed"]).default("open"),
  INVITE_CODE: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return schema.parse(source);
}

// Lazy singleton: evaluated on first access, not at module load time.
// This allows test files to import `loadEnv` without triggering a parse of
// process.env (which lacks BETTER_AUTH_SECRET in the test environment).
// In production the getter runs once and is then cached.
let _env: Env | undefined;
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    if (!_env) _env = loadEnv();
    return _env[prop as keyof Env];
  },
});
