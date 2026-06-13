import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { user } from "@/db/schema";

type Db = {
  select(fields: Record<string, unknown>): {
    from(table: unknown): { where(cond: unknown): { limit(n: number): Promise<Array<{ username: string | null }>> } };
  };
};

/** The GitHub handle (username) for a user id, or null. */
export async function getUserHandle(userId: string, db: Db = defaultDb as unknown as Db): Promise<string | null> {
  const rows = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1);
  return rows[0]?.username ?? null;
}
