/**
 * Vitest runner for scripts/create-agent.ts. Lives here (not under src/) so it
 * is excluded from the regular `pnpm test` suite. Prints the generated bearer
 * key and Ed25519 private JWK exactly once (neither can be recovered later).
 *
 * Usage with env: DATABASE_URL, AGENT_HANDLE, AGENT_NAME
 *
 *   docker run --rm --network sumi_default \
 *     -e DATABASE_URL='postgresql://sumi:sumi@db:5432/sumi' \
 *     -e AGENT_HANDLE='agent-reflector' \
 *     -e AGENT_NAME='Reflector' \
 *     -v "$PWD/scripts:/app/scripts:ro" \
 *     sumi-migrate pnpm exec vitest run scripts/create-agent.test.ts
 */
import { expect, test } from "vitest";
import { createAgent } from "./create-agent";

test("creates an agent with a bearer key + Ed25519 signing pair", async () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const handle = process.env.AGENT_HANDLE ?? "";
  const displayName = process.env.AGENT_NAME ?? handle;

  expect(databaseUrl, "DATABASE_URL required").toBeTruthy();
  expect(handle, "AGENT_HANDLE required").toBeTruthy();

  const creds = await createAgent({ handle, displayName, databaseUrl });

  expect(creds.apiKey.startsWith("sumi_")).toBe(true);
  expect(creds.privateJwk.x).toBeTruthy();
  expect(creds.privateJwk.d).toBeTruthy();

  console.log(`\n=== AGENT CREDENTIALS (show once, store securely) ===
SUMI_API_KEY=${creds.apiKey}
SUMI_API_PRIVATE_KEY=${JSON.stringify(creds.privateJwk)}
===========================================================`);
}, 30_000);
