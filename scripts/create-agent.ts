import { randomUUID } from "node:crypto";
import { createDb } from "../src/lib/db";
import { agentKeys } from "../src/db/schema";
import { generateApiKey, hashApiKey } from "../src/lib/agent-keys";

export interface CreateAgentInput {
  handle: string;
  displayName: string;
  databaseUrl: string;
}

/**
 * Create an agent API key. Only the SHA-256 hash is persisted; the caller must
 * capture and hand the returned plaintext key to the agent (it cannot be
 * recovered later). One key per agent handle.
 */
export async function createAgent({ handle, displayName, databaseUrl }: CreateAgentInput): Promise<string> {
  const db = createDb(databaseUrl);
  const key = generateApiKey();
  await db.insert(agentKeys).values({
    id: randomUUID(),
    agentHandle: handle,
    displayName,
    keyHash: hashApiKey(key),
  });
  return key;
}