import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { schema as dbSchema, sumiAiProviders, sumiAiTasks } from "@/db/schema";
import { parseSummaryPoint } from "@/lib/ai/summary-point";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import type { AiProviderConfig, AiStore, AiSummaryPoint, AiSummaryResult, AiTask } from "./ai-store";

type Db = PostgresJsDatabase<typeof dbSchema>;

interface ProviderRow {
  handle: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface TaskRow {
  id: string;
  handle: string;
  postHandle: string;
  postSlug: string;
  kind: string;
  status: string;
  result: string | null;
  error: string | null;
  model: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

function parseResult(raw: string | null): AiSummaryResult | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiSummaryResult>;
    if (typeof parsed.tldr === "string" && Array.isArray(parsed.points)) {
      const points = parsed.points
        .map(parseSummaryPoint)
        .filter((p): p is AiSummaryPoint => p !== null);
      if (points.length) {
        const summary =
          typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : undefined;
        return { summary, tldr: parsed.tldr, points };
      }
    }
  } catch {
    // fall through — treat malformed stored result as null
  }
  return null;
}

function toTask(row: TaskRow): AiTask {
  return {
    id: row.id,
    handle: row.handle,
    postHandle: row.postHandle,
    postSlug: row.postSlug,
    kind: row.kind,
    status: (["pending", "running", "done", "failed"].includes(row.status) ? row.status : "pending") as AiTask["status"],
    result: parseResult(row.result),
    error: row.error,
    model: row.model,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

export class DbAiStore implements AiStore {
  constructor(private readonly db: Db) {}

  async getProvider(handle: string): Promise<AiProviderConfig | null> {
    const rows = await this.db
      .select()
      .from(sumiAiProviders)
      .where(eq(sumiAiProviders.handle, handle))
      .limit(1);
    const row = rows[0] as ProviderRow | undefined;
    if (!row) return null;
    const apiKey = decryptSecret(row.apiKey, env.BETTER_AUTH_SECRET) ?? row.apiKey;
    return {
      handle: row.handle,
      baseUrl: row.baseUrl,
      apiKey,
      model: row.model,
      enabled: row.enabled,
    };
  }

  async saveProvider(provider: AiProviderConfig, now: Date): Promise<void> {
    const values = {
      handle: provider.handle,
      baseUrl: provider.baseUrl,
      // API keys are encrypted at rest with the app master secret so a DB
      // leak never exposes third-party provider keys in plaintext.
      apiKey: encryptSecret(provider.apiKey, env.BETTER_AUTH_SECRET),
      model: provider.model,
      enabled: provider.enabled,
      updatedAt: now.toISOString(),
    };
    await this.db
      .insert(sumiAiProviders)
      .values(values)
      .onConflictDoUpdate({ target: sumiAiProviders.handle, set: values });
  }

  async getTask(handle: string, postSlug: string): Promise<AiTask | null> {
    const rows = await this.db
      .select()
      .from(sumiAiTasks)
      .where(and(eq(sumiAiTasks.handle, handle), eq(sumiAiTasks.postSlug, postSlug)))
      .limit(1);
    return rows[0] ? toTask(rows[0] as TaskRow) : null;
  }

  async enqueueSummary(handle: string, postSlug: string, now: Date): Promise<void> {
    const existing = await this.db
      .select({ id: sumiAiTasks.id, status: sumiAiTasks.status })
      .from(sumiAiTasks)
      .where(and(eq(sumiAiTasks.handle, handle), eq(sumiAiTasks.postSlug, postSlug)))
      .limit(1);
    // One row per post: skip only while a task is already pending/running;
    // otherwise reuse the row (failed or done -> fresh attempt on re-publish).
    if (existing.length) {
      if (existing[0].status === "pending" || existing[0].status === "running") return;
      await this.db
        .update(sumiAiTasks)
        .set({
          status: "pending",
          result: null,
          error: null,
          model: null,
          createdAt: now.toISOString(),
          startedAt: null,
          finishedAt: null,
        })
        .where(eq(sumiAiTasks.id, existing[0].id));
      return;
    }
    await this.db.insert(sumiAiTasks).values({
      id: randomUUID(),
      handle,
      postHandle: handle,
      postSlug,
      kind: "summary",
      status: "pending",
      createdAt: now.toISOString(),
    });
  }

  async claimPending(limit: number, now: Date): Promise<AiTask[]> {
    const rows = await this.db
      .select()
      .from(sumiAiTasks)
      .where(eq(sumiAiTasks.status, "pending"))
      .limit(limit);
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    await this.db
      .update(sumiAiTasks)
      .set({ status: "running", startedAt: now.toISOString() })
      .where(inArray(sumiAiTasks.id, ids));
    return rows.map((r) => toTask(r as TaskRow));
  }

  async finishTask(
    id: string,
    input: { status: AiTask["status"]; result?: AiSummaryResult | null; error?: string | null; model?: string | null; now: Date },
  ): Promise<void> {
    await this.db
      .update(sumiAiTasks)
      .set({
        status: input.status,
        result: input.result ? JSON.stringify(input.result) : null,
        error: input.error ?? null,
        model: input.model ?? null,
        finishedAt: input.now.toISOString(),
      })
      .where(eq(sumiAiTasks.id, id));
  }

  async resetTask(handle: string, postSlug: string, now: Date): Promise<void> {
    await this.db
      .update(sumiAiTasks)
      .set({ status: "pending", error: null, result: null, finishedAt: null, startedAt: null, createdAt: now.toISOString() })
      .where(and(eq(sumiAiTasks.handle, handle), eq(sumiAiTasks.postSlug, postSlug)));
  }
}
