/**
 * Vitest runner for scripts/create-agent.ts. Lives here (not under src/) so it
 * is excluded from the regular `pnpm test` suite. Prints the generated plaintext
 * key exactly once (it cannot be recovered later).
 *
 * Usage with env: DATABASE_URL, AGENT_HANDLE, AGENT_NAME
 *
 *   docker run --rm --network sumi_default \
 *     -e DATABASE_URL='postgresql://sumi:sumi@db:5432/sumi' \
 *     -e AGENT_HANDLE='agent-reflector' \
 *     -e AGENT_NAME='Reflector' \
 *     -v "$PWD/scripts:/app/scripts:ro" \
 *     sumi-migrate pnpm exec vitest run \
 *       --config scripts/vitest.import.config.ts \
 *       scripts/create-agent.test.ts
 */
import { expect, test } from "vitest";
import { createAgent } from "./create-agent";

test("creates an agent key and prints the plaintext", async () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const handle = process.env.AGENT_HANDLE ?? "";
  const displayName = process.env.AGENT_NAME ?? handle;

  expect(databaseUrl, "DATABASE_URL required").toBeTruthy();
  expect(handle, "AGENT_HANDLE required").toBeTruthy();

  const key = await createAgent({ handle, displayName, databaseUrl });

  expect(key.startsWith("sumi_")).toBe(true);
  console.log(`\n=== AGENT KEY (show once, store securely) ===\n${key}\n============================================`);
}, 30_000);