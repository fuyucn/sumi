import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import { hashApiKey } from "@/lib/agent-keys";

export type AgentAuth = { ok: true; agentHandle: string; displayName: string } | { ok: false; error: string };

export { generateApiKey, hashApiKey } from "@/lib/agent-keys";

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

/** Authenticate an agent from the `Authorization: Bearer <key>` header. */
export async function authenticateAgent(authorization: string | null): Promise<AgentAuth> {
  const token = extractBearerToken(authorization);
  if (!token) return { ok: false, error: "Missing or malformed Authorization: Bearer <key> header" };

  const hash = hashApiKey(token);
  const rows = await db.select().from(agentKeys).where(eq(agentKeys.keyHash, hash)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "Invalid API key" };

  await db.update(agentKeys).set({ lastUsedAt: new Date() }).where(eq(agentKeys.id, row.id));
  return { ok: true, agentHandle: row.agentHandle, displayName: row.displayName };
}
