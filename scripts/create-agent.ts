import { generateKeyPairSync } from "node:crypto";
import { randomUUID } from "node:crypto";
import { createDb } from "../src/lib/db";
import { agentKeys } from "../src/db/schema";
import { generateApiKey, hashApiKey } from "../src/lib/agent-keys";

export interface CreateAgentInput {
  handle: string;
  displayName: string;
  databaseUrl: string;
}

export interface AgentCredential {
  /** Shared-secret bearer key (hashed at rest). Identifies the agent. */
  apiKey: string;
  /**
   * Ed25519 private JWK `{"x":"<pub>","d":"<priv>"}` — the REAL credential.
   * Hand this to the agent runtime (SUMI_API_PRIVATE_KEY). Every request must
   * be signed with it; the server verifies against the stored public key.
   */
  privateJwk: { x: string; d: string };
}

function generateKeypair() {
  const { privateKey } = generateKeyPairSync("ed25519");
  const jwk = privateKey.export({ format: "jwk" }) as { x: string; d: string };
  return jwk;
}

/**
 * Create an agent. Returns the bearer key AND the Ed25519 private JWK. Only the
 * bearer hash + public key are persisted; the plaintext bearer and the private
 * key are shown once and can never be recovered.
 */
export async function createAgent({ handle, displayName, databaseUrl }: CreateAgentInput): Promise<AgentCredential> {
  const db = createDb(databaseUrl);
  const apiKey = generateApiKey();
  const { x, d } = generateKeypair();
  await db.insert(agentKeys).values({
    id: randomUUID(),
    agentHandle: handle,
    displayName,
    keyHash: hashApiKey(apiKey),
    publicKey: x,
  });
  return { apiKey, privateJwk: { x, d } };
}