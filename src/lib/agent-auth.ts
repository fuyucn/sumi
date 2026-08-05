import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import { hashApiKey } from "@/lib/agent-keys";
import { timestampInWindow, verifySignature } from "@/lib/agent-signature";

export type AgentAuth = { ok: true; agentHandle: string; displayName: string } | { ok: false; error: string };

export { generateApiKey, hashApiKey } from "@/lib/agent-keys";

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export interface SignedRequest {
  method: string;
  pathname: string;
  /** Raw request body bytes (string form). Empty for bodyless requests. */
  body: string;
  authorization: string | null;
  signature: string | null;
  timestamp: string | null;
}

/**
 * Authenticate an agent request. Two factors, both required:
 *   1. Bearer agent key → identifies the agent (hashed at rest).
 *   2. Ed25519 signature (X-Agent-Signature) over the canonical request string,
 *      verified with the agent's registered public key — a leaked bearer key
 *      alone cannot impersonate the agent.
 */
export async function authenticateAgent(req: SignedRequest): Promise<AgentAuth> {
  const token = extractBearerToken(req.authorization);
  if (!token) return { ok: false, error: "Missing or malformed Authorization: Bearer <key> header" };

  const rows = await db.select().from(agentKeys).where(eq(agentKeys.keyHash, hashApiKey(token))).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "Invalid API key" };
  if (!row.publicKey) return { ok: false, error: `Agent @${row.agentHandle} has no registered signing key` };

  if (!req.signature || !req.timestamp) {
    return { ok: false, error: "Missing X-Agent-Signature / X-Agent-Timestamp headers" };
  }
  if (!timestampInWindow(req.timestamp)) {
    return { ok: false, error: "Request timestamp out of window (clock skew or replay)" };
  }
  const ok = verifySignature(
    row.publicKey,
    req.signature,
    req.method,
    req.pathname,
    req.body,
    req.timestamp,
  );
  if (!ok) return { ok: false, error: "Signature verification failed" };

  await db.update(agentKeys).set({ lastUsedAt: new Date() }).where(eq(agentKeys.id, row.id));
  return { ok: true, agentHandle: row.agentHandle, displayName: row.displayName };
}

/**
 * Bearer-only authentication. Used by transports that cannot produce a
 * request signature (e.g. remote MCP clients such as opencode, which only
 * send an Authorization header). Still keys on the hashed agent key.
 */
export async function authenticateBearer(authorization: string | null): Promise<AgentAuth> {
  const token = extractBearerToken(authorization);
  if (!token) return { ok: false, error: "Missing or malformed Authorization: Bearer <key> header" };

  const rows = await db.select().from(agentKeys).where(eq(agentKeys.keyHash, hashApiKey(token))).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "Invalid API key" };

  await db.update(agentKeys).set({ lastUsedAt: new Date() }).where(eq(agentKeys.id, row.id));
  return { ok: true, agentHandle: row.agentHandle, displayName: row.displayName };
}
