import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "./env";
import { schema } from "@/db/schema";

export function createDb(url: string) {
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Shared instance for the app (lazy: built at import, connects on first query).
export const db = createDb(env.DATABASE_URL);
