import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "./env";
import { schema } from "@/db/schema";

// TCP driver (postgres-js): works with Neon's connection strings, a local
// Postgres, or the Postgres container shipped with `docker compose up`.
// `prepare:false` keeps queries preparable across pool connections, and `max:1`
// avoids exhausting connections in long-lived containers / serverless workers.
export function createDb(url: string) {
  const client = postgres(url, { max: 1, prepare: false });
  return drizzle(client, { schema });
}

// Lazy singleton: `env` (and DATABASE_URL) is NOT accessed at module load —
// only on the first property access of `db` (i.e. the first request).
let _db: ReturnType<typeof createDb> | undefined;
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_t, prop) {
    _db ??= createDb(env.DATABASE_URL);
    return _db[prop as keyof typeof _db];
  },
  has(_t, prop) {
    _db ??= createDb(env.DATABASE_URL);
    return prop in _db;
  },
});
