// One-shot backfill: generate AI 总结 for every published post that has no
// finished summary task. Reuses the same prompt/parse/LLM path as the editor
// button (src/lib/ai/summarize.ts) and persists results through the same
// tables (sumi_ai_tasks, sumi_notifications) so the article page renders the
// panel without manual clicks.
//
// Usage (host can reach the Postgres container directly):
//   DATABASE_URL=postgresql://sumi:sumi@127.0.0.1:5432/sumi \
//     npx tsx scripts/backfill-ai-summaries.ts
//
// Inside the compose network the default DATABASE_URL from .env already works:
//   docker compose exec app npx tsx scripts/backfill-ai-summaries.ts

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { schema } from "@/db/schema";
import { chatCompletion, parseSummaryResponse, summaryPrompt } from "@/lib/ai/summarize";
import { env } from "@/lib/env";

interface PostRow {
  handle: string;
  slug: string;
  title: string;
  body: string;
  tags: string;
  excerpt: string | null;
  status: string;
  agent: boolean;
}

interface ProviderRow {
  handle: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

async function main() {
  const db = createDb(env.DATABASE_URL);
  const owner = process.env.SUMI_OWNER_HANDLE ?? "fuyucn";

  const posts = (await db
    .select({
      handle: schema.sumiPosts.handle,
      slug: schema.sumiPosts.slug,
      title: schema.sumiPosts.title,
      body: schema.sumiPosts.body,
      tags: schema.sumiPosts.tags,
      excerpt: schema.sumiPosts.excerpt,
      status: schema.sumiPosts.status,
      agent: schema.sumiPosts.agent,
    })
    .from(schema.sumiPosts)
    .where(eq(schema.sumiPosts.status, "published"))) as PostRow[];

  const tasks = (await db
    .select({
      postHandle: schema.sumiAiTasks.postHandle,
      postSlug: schema.sumiAiTasks.postSlug,
      status: schema.sumiAiTasks.status,
    })
    .from(schema.sumiAiTasks)
    .where(inArray(schema.sumiAiTasks.status, ["done", "running", "pending"]))) as Array<{
    postHandle: string;
    postSlug: string;
    status: string;
  }>;

  const hasTask = new Set(tasks.map((t) => `${t.postHandle}/${t.postSlug}`));
  const missing = posts.filter((p) => !hasTask.has(`${p.handle}/${p.slug}`));

  if (!missing.length) {
    console.log("No published posts missing an AI 总结. Nothing to do.");
    await db.$client.end();
    return;
  }

  const providerRows = (await db
    .select()
    .from(schema.sumiAiProviders)
    .where(and(eq(schema.sumiAiProviders.handle, owner), eq(schema.sumiAiProviders.enabled, true)))
    .limit(1)) as unknown as ProviderRow[];

  const provider = providerRows[0];
  if (!provider) {
    console.error(`No enabled AI provider for "${owner}" (sumi_ai_providers). Aborting.`);
    await db.$client.end();
    process.exit(1);
  }
  console.log(`Provider: ${provider.handle} / ${provider.model}`);

  let ok = 0;
  let failed = 0;
  for (const post of missing) {
    const now = new Date();
    process.stdout.write(`@${post.handle}/${post.slug} … `);
    try {
      const messages = summaryPrompt(post.body);
      const raw = await chatCompletion(provider, messages);
      const result = parseSummaryResponse(raw);
      await db.insert(schema.sumiAiTasks).values({
        id: randomUUID(),
        handle: post.handle,
        postHandle: post.handle,
        postSlug: post.slug,
        kind: "summary",
        status: "done",
        result: JSON.stringify(result),
        error: null,
        model: provider.model,
        createdAt: now.toISOString(),
        startedAt: now.toISOString(),
        finishedAt: now.toISOString(),
      });
      await db.insert(schema.sumiNotifications).values({
        id: randomUUID(),
        handle: owner,
        type: "ai",
        actor: owner,
        postHandle: post.handle,
        postSlug: post.slug,
        commentId: null,
        body: `AI 总结已生成（${provider.model}）`,
        date: now.toISOString(),
        read: false,
        createdAt: now.toISOString(),
      });
      // Mirror the editor: backfill excerpt (导读) from the TL;DR only for
      // human-authored posts; agent posts keep whatever excerpt their author set.
      if (!post.agent && result.tldr) {
        await db
          .update(schema.sumiPosts)
          .set({ excerpt: result.tldr.slice(0, 200), updatedAt: now.toISOString() })
          .where(and(eq(schema.sumiPosts.handle, post.handle), eq(schema.sumiPosts.slug, post.slug)));
      }
      ok++;
      console.log("done");
    } catch (e) {
      failed++;
      console.error(`failed: ${e instanceof Error ? e.message : String(e)}`);
      await db.insert(schema.sumiNotifications).values({
        id: randomUUID(),
        handle: owner,
        type: "ai",
        actor: owner,
        postHandle: post.handle,
        postSlug: post.slug,
        commentId: null,
        body: `AI 总结生成失败：${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`,
        date: now.toISOString(),
        read: false,
        createdAt: now.toISOString(),
      });
    }
  }

  console.log(`\nBackfill finished: ${ok} ok, ${failed} failed.`);
  await db.$client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
