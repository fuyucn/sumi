import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { account } from "@/db/schema";

type Db = {
  select(fields: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(n: number): Promise<Array<{ accessToken: string | null }>>;
      };
    };
  };
};

/** Fetch the stored GitHub OAuth access token for a user, or null. */
export async function getGithubToken(
  userId: string,
  db: Db = defaultDb as unknown as Db,
): Promise<string | null> {
  const rows = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .limit(1);
  return rows[0]?.accessToken ?? null;
}
