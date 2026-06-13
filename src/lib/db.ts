import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "./env";

export function createDb(file: string) {
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }
  const db = new Database(file);
  // WAL is ignored for :memory: databases (SQLite silently no-ops).
  db.pragma("journal_mode = WAL");
  return db;
}

// Single shared instance for the running app.
export const db = createDb(env.DATABASE_FILE);
