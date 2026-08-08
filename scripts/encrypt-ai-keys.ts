// One-shot migration: encrypt any legacy plaintext AI provider API keys in
// `sumi_ai_providers` at rest. Rows written after this change are already
// encrypted by DbAiStore.saveProvider, so this only touches `enc:v1:`-less
// values left over from before the at-rest encryption landed.
//
// Usage (host can reach the Postgres container directly):
//   DATABASE_URL=postgresql://sumi:sumi@127.0.0.1:5432/sumi \
//     npx tsx scripts/encrypt-ai-keys.ts
//
// Inside the compose network the default DATABASE_URL from .env already works:
//   docker compose exec app npx tsx scripts/encrypt-ai-keys.ts

import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { schema } from "@/db/schema";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

async function main() {
  const db = createDb(env.DATABASE_URL);
  const rows = (await db
    .select({ handle: schema.sumiAiProviders.handle, apiKey: schema.sumiAiProviders.apiKey })
    .from(schema.sumiAiProviders)) as Array<{ handle: string; apiKey: string }>;

  const plaintext = rows.filter((r) => !isEncryptedSecret(r.apiKey));
  if (!plaintext.length) {
    console.log("No legacy plaintext provider keys found. Nothing to do.");
    await db.$client.end();
    return;
  }

  let ok = 0;
  let skipped = 0;
  for (const row of plaintext) {
    // Re-encrypting a plaintext key must round-trip through decrypt so a key
    // that was already encrypted but lost its prefix can't be double-wrapped.
    const plain = decryptSecret(row.apiKey, env.BETTER_AUTH_SECRET) ?? row.apiKey;
    if (!plain.trim()) {
      skipped++;
      console.warn(`@${row.handle}: empty api_key, skipped`);
      continue;
    }
    await db
      .update(schema.sumiAiProviders)
      .set({ apiKey: encryptSecret(plain, env.BETTER_AUTH_SECRET) })
      .where(eq(schema.sumiAiProviders.handle, row.handle));
    ok++;
    console.log(`@${row.handle}: encrypted`);
  }

  console.log(`\nDone: ${ok} encrypted, ${skipped} skipped (empty).`);
  await db.$client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
