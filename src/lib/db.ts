import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "./env";
import { schema } from "@/db/schema";

export function createDb(url: string) {
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy singleton: `env` (and DATABASE_URL) is NOT accessed at module load —
// only on the first property access of `db` (i.e. the first request).
let _db: ReturnType<typeof createDb> | undefined;
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_t, prop) {
    _db ??= createDb(env.DATABASE_URL);
    return _db[prop as keyof typeof _db];
  },
});
