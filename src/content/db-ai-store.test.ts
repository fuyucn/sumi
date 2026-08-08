import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { expect, test } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "@/db/schema";
import { DbAiStore } from "./db-ai-store";
import type { AiSummaryResult } from "./ai-store";

const DDL = `
CREATE TABLE "sumi_ai_providers" (
  "handle" text PRIMARY KEY NOT NULL,
  "base_url" text DEFAULT 'https://api.openai.com/v1' NOT NULL,
  "api_key" text NOT NULL,
  "model" text DEFAULT 'gpt-4o-mini' NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" text NOT NULL
);
CREATE TABLE "sumi_ai_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "handle" text NOT NULL,
  "post_handle" text NOT NULL,
  "post_slug" text NOT NULL,
  "kind" text DEFAULT 'summary' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "result" text,
  "error" text,
  "model" text,
  "created_at" text NOT NULL,
  "started_at" text,
  "finished_at" text
);
`;

async function makeStore() {
  const client = new PGlite();
  await client.exec(DDL);
  const db = drizzle(client, { schema }) as unknown as PostgresJsDatabase<typeof schema>;
  return { store: new DbAiStore(db), client };
}

const NOW = new Date("2026-08-07T12:00:00.000Z");

test("provider save + get round-trip", async () => {
  const { store } = await makeStore();
  expect(await store.getProvider("alice")).toBeNull();
  await store.saveProvider(
    { handle: "alice", baseUrl: "https://example.com/v1", apiKey: "sk-x", model: "m1", enabled: true },
    NOW,
  );
  expect(await store.getProvider("alice")).toEqual({
    handle: "alice",
    baseUrl: "https://example.com/v1",
    apiKey: "sk-x",
    model: "m1",
    enabled: true,
  });
});

test("provider apiKey is encrypted at rest", async () => {
  const { store, client } = await makeStore();
  await store.saveProvider(
    { handle: "alice", baseUrl: "https://example.com/v1", apiKey: "sk-super-secret", model: "m1", enabled: true },
    NOW,
  );
  const result = (await client.query(
    `select "api_key" from "sumi_ai_providers" where "handle" = 'alice'`,
  )) as { rows: Array<{ api_key: string }> };
  const stored = result.rows[0].api_key;
  expect(stored).toMatch(/^enc:v1:/);
  expect(stored).not.toContain("sk-super-secret");
});

test("legacy plaintext apiKey still reads back (backward compatible)", async () => {
  const { store, client } = await makeStore();
  await client.query(
    `insert into "sumi_ai_providers" ("handle","base_url","api_key","model","enabled","updated_at") ` +
      `values ('bob','https://example.com/v1','sk-legacy','m2',true,'2026-08-07T12:00:00.000Z')`,
  );
  expect(await store.getProvider("bob")).toMatchObject({
    handle: "bob",
    apiKey: "sk-legacy",
    model: "m2",
    enabled: true,
  });
});

test("enqueueSummary creates one pending task per post and dedupes", async () => {
  const { store } = await makeStore();
  await store.enqueueSummary("alice", "hello-world", NOW);
  await store.enqueueSummary("alice", "hello-world", NOW);
  const task = await store.getTask("alice", "hello-world");
  expect(task).not.toBeNull();
  expect(task!.status).toBe("pending");
  expect(task!.kind).toBe("summary");
});

test("re-enqueue after failure resets the task to pending", async () => {
  const { store } = await makeStore();
  await store.enqueueSummary("alice", "hello-world", NOW);
  const task = await store.getTask("alice", "hello-world");
  await store.finishTask(task!.id, { status: "failed", error: "boom", now: NOW });
  await store.enqueueSummary("alice", "hello-world", NOW);
  const reset = await store.getTask("alice", "hello-world");
  expect(reset!.status).toBe("pending");
  expect(reset!.error).toBeNull();
  expect(reset!.result).toBeNull();
});

test("claimPending atomically claims up to the limit", async () => {
  const { store } = await makeStore();
  for (const slug of ["a", "b", "c"]) await store.enqueueSummary("alice", slug, NOW);
  const claimed = await store.claimPending(2, NOW);
  expect(claimed.map((t) => t.postSlug).sort()).toEqual(["a", "b"]);
  for (const t of claimed) {
    const fresh = await store.getTask("alice", t.postSlug);
    expect(fresh!.status).toBe("running");
    expect(fresh!.startedAt).toBe(NOW.toISOString());
  }
  const rest = await store.claimPending(10, NOW);
  expect(rest.map((t) => t.postSlug)).toEqual(["c"]);
  expect(await store.claimPending(10, NOW)).toEqual([]);
});

test("finishTask stores done result and model", async () => {
  const { store } = await makeStore();
  await store.enqueueSummary("alice", "hello-world", NOW);
  const task = await store.getTask("alice", "hello-world");
  await store.claimPending(5, NOW);
  await store.finishTask(task!.id, {
    status: "done",
    result: { tldr: "总结", points: [{ text: "要点", anchor: "安装" }] },
    model: "mock-llm",
    now: NOW,
  });
  const done = await store.getTask("alice", "hello-world");
  expect(done!.status).toBe("done");
  expect(done!.result).toEqual({ tldr: "总结", points: [{ text: "要点", anchor: "安装" }] });
  expect(done!.model).toBe("mock-llm");
  expect(done!.finishedAt).toBe(NOW.toISOString());
});

test("legacy string-point results are normalized on read", async () => {
  const { store } = await makeStore();
  await store.enqueueSummary("alice", "hello-world", NOW);
  const task = await store.getTask("alice", "hello-world");
  await store.claimPending(5, NOW);
  await store.finishTask(task!.id, {
    status: "done",
    // Legacy rows stored `points` as string[] before the object shape existed.
    result: { tldr: "总结", points: ["要点一", "要点二"] } as unknown as AiSummaryResult,
    now: NOW,
  });
  const done = await store.getTask("alice", "hello-world");
  expect(done!.result).toEqual({ tldr: "总结", points: [{ text: "要点一" }, { text: "要点二" }] });
});

test("malformed stored result parses as null", async () => {
  const { store } = await makeStore();
  await store.enqueueSummary("alice", "hello-world", NOW);
  const task = await store.getTask("alice", "hello-world");
  await store.claimPending(5, NOW);
  await store.finishTask(task!.id, { status: "done", result: { tldr: "x", points: [] }, now: NOW });
  await store.finishTask(task!.id, { status: "failed", error: "bad json", now: NOW });
  const failed = await store.getTask("alice", "hello-world");
  expect(failed!.status).toBe("failed");
  expect(failed!.error).toBe("bad json");
  expect(failed!.result).toBeNull();
});

test("resetTask requeues a failed task", async () => {
  const { store } = await makeStore();
  await store.enqueueSummary("alice", "hello-world", NOW);
  const task = await store.getTask("alice", "hello-world");
  await store.finishTask(task!.id, { status: "failed", error: "boom", now: NOW });
  await store.resetTask("alice", "hello-world", NOW);
  const reset = await store.getTask("alice", "hello-world");
  expect(reset!.status).toBe("pending");
  expect(reset!.startedAt).toBeNull();
  expect(reset!.finishedAt).toBeNull();
});
