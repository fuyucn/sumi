"use server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import { getAiStore, getContentStoreForUser, getReadContentStore } from "@/content";
import { runDeletePost, runSavePost, runUploadImage, type WriteDeps } from "./actions-core";
import { firstSentence } from "@/lib/first-sentence";
import { generateSummary } from "@/lib/ai/summarize";
import { AI_GENERATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import type { AiTask } from "@/content/ai-store";
import type { WriteForm } from "@/content/post-input";
import type { TagInfo } from "@/content/store";

async function resolveDeps(): Promise<WriteDeps> {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const [handle, store] = userId
    ? await Promise.all([getUserHandle(userId), getContentStoreForUser(userId)])
    : [null, null];
  return { userId, handle, store };
}

export async function savePostAction(
  form: WriteForm,
) {
  "use server";
  const deps = await resolveDeps();
  const result = await runSavePost(deps, form, new Date());
  return result;
}

export async function deletePostAction(slug: string) {
  "use server";
  return runDeletePost(await resolveDeps(), slug);
}

export async function uploadImageAction(input: { title: string; filename: string; base64: string }) {
  "use server";
  const bytes = Uint8Array.from(Buffer.from(input.base64, "base64"));
  return runUploadImage(await resolveDeps(), { title: input.title, filename: input.filename, bytes });
}

export async function getTagsLibraryAction(): Promise<TagInfo[]> {
  return (await (await getReadContentStore())?.listTags()) ?? [];
}

export type GenerateSummaryResult = { ok: true; task: AiTask } | { ok: false; error: string };

export type ClearSummaryResult = { ok: true } | { ok: false; error: string };

/**
 * Author-only, synchronous one-click AI 总结 generation from the editor.
 * Runs the LLM call inline so the button returns the finished result directly
 * (no background queue); the result is persisted so the article page shows it.
 */
export async function generateSummaryAction(
  slug: string,
  body?: string,
  sourceHandle?: string,
): Promise<GenerateSummaryResult> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "请先登录" };
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  if (!handle || !store) return { ok: false, error: "账号没有可用的内容后端" };
  // Cost valve: LLM generation is capped per owner handle so a leaked session
  // or a runaway agent can't burn provider quota.
  const { allowed } = rateLimit(`ai-gen:${handle}`, AI_GENERATE_LIMIT);
  if (!allowed) return { ok: false, error: "生成过于频繁，请 30 分钟后再试" };
  if (sourceHandle && sourceHandle !== handle) {
    const rows = await db
      .select({ handle: agentKeys.agentHandle })
      .from(agentKeys)
      .where(eq(agentKeys.agentHandle, sourceHandle))
      .limit(1);
    if (!rows.length) return { ok: false, error: `@${sourceHandle} 不是 agent handle` };
  }
  // While an agent draft is being edited it may not yet be saved under the
  // user's handle; read the body from the source handle in that case. The task
  // belongs to the author (agent handle when editing an agent post) while the
  // provider config and notifications stay on the signed-in user.
  const taskHandle = sourceHandle ?? handle;
  const post = await store.getPost(taskHandle, slug);
  if (!post) return { ok: false, error: "文章不存在，请先保存一次" };
  const aiStore = await getAiStore();
  if (!aiStore) return { ok: false, error: "AI 后端未配置（需要 Postgres 存储）" };
  const provider = await aiStore.getProvider(handle);
  if (!provider || !provider.enabled) {
    await store.addNotification(
      handle,
      {
        type: "ai",
        actor: handle,
        postHandle: handle,
        postSlug: slug,
        body: "AI 总结未生成：未配置 AI provider（Settings → AI 总结）",
      },
      new Date(),
    );
    return { ok: false, error: "未配置 AI provider：请到 Settings → AI 总结 中启用" };
  }

  const now = new Date();
  await aiStore.enqueueSummary(taskHandle, slug, now);
  const task = await aiStore.getTask(taskHandle, slug);
  if (!task) return { ok: false, error: "任务创建失败，请重试" };

  try {
    const result = await generateSummary(provider, body && body.trim() ? body : post.body);
    await aiStore.finishTask(task.id, { status: "done", result, model: provider.model, now });
    await store.addNotification(
      handle,
      {
        type: "ai",
        actor: handle,
        postHandle: handle,
        postSlug: slug,
        body: `AI 总结已生成（${provider.model}）`,
      },
      now,
    );
    // Backfill the post's excerpt (导读) from the AI TL;DR so list cards and
    // metadata stay fresh without manual writing. Only for the author's own
    // posts — agent posts keep whatever excerpt their author set — and only
    // when there is no manual 导读 and the current value is still the
    // mechanical first-sentence fallback (manual and AI both win over it).
    if (!sourceHandle && result.tldr && (!post.excerpt?.trim() || post.excerpt === firstSentence(post.body))) {
      try {
        await store.savePost(handle, {
          slug,
          title: post.title,
          body: post.body,
          tags: post.tags,
          excerpt: result.tldr.slice(0, 200),
          status: post.status,
          ...(post.publishedAt ? { publishedAt: post.publishedAt } : {}),
          ...(post.coverImage ? { coverImage: post.coverImage } : {}),
          ...(post.agent ? { agent: true } : {}),
        });
      } catch {
        // Excerpt backfill is best-effort; the summary task itself already
        // succeeded and was persisted above.
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await aiStore.finishTask(task.id, { status: "failed", error: message.slice(0, 500), now });
    await store.addNotification(
      handle,
      {
        type: "ai",
        actor: handle,
        postHandle: handle,
        postSlug: slug,
        body: `AI 总结生成失败：${message.slice(0, 300)}`,
      },
      now,
    );
    return { ok: false, error: message.slice(0, 500) };
  }

  const done = await aiStore.getTask(taskHandle, slug);
  return done ? { ok: true, task: done } : { ok: false, error: "生成结果读取失败，请重试" };
}

/**
 * Author-only removal of an AI 总结: deletes the stored task row and clears the
 * excerpt (导读) backfill so the article and lists return to their pre-AI state.
 */
export async function clearSummaryAction(slug: string, sourceHandle?: string): Promise<ClearSummaryResult> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "请先登录" };
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  if (!handle || !store) return { ok: false, error: "账号没有可用的内容后端" };
  if (sourceHandle && sourceHandle !== handle) {
    const rows = await db
      .select({ handle: agentKeys.agentHandle })
      .from(agentKeys)
      .where(eq(agentKeys.agentHandle, sourceHandle))
      .limit(1);
    if (!rows.length) return { ok: false, error: `@${sourceHandle} 不是 agent handle` };
  }
  const taskHandle = sourceHandle ?? handle;
  const aiStore = await getAiStore();
  if (!aiStore) return { ok: false, error: "AI 后端未配置（需要 Postgres 存储）" };

  // Capture the backfilled excerpt (导读) before deleting the task, so clearing
  // only removes what AI wrote and never a manually authored 导读.
  const existingTask = await aiStore.getTask(taskHandle, slug);
  await aiStore.deleteTask(taskHandle, slug);

  // Only clear the excerpt backfill for the author's own posts when the current
  // 导读 exactly matches the AI TL;DR backfill; agent posts and manual 导读
  // are left untouched.
  const aiBackfilled = existingTask?.status === "done" && existingTask.result?.tldr;
  if (!sourceHandle && aiBackfilled) {
    const post = await store.getPost(handle, slug);
    if (post && post.excerpt === aiBackfilled.slice(0, 200)) {
      try {
        // Restore the pre-AI state: no excerpt, or the first-sentence fallback
        // that save-time fill left behind.
        const fallback = firstSentence(post.body);
        await store.savePost(handle, {
          slug,
          title: post.title,
          body: post.body,
          tags: post.tags,
          ...(fallback ? { excerpt: fallback } : {}),
          status: post.status,
          ...(post.publishedAt ? { publishedAt: post.publishedAt } : {}),
          ...(post.coverImage ? { coverImage: post.coverImage } : {}),
          ...(post.agent ? { agent: true } : {}),
        });
      } catch {
        // Excerpt clearing is best-effort; the task removal already succeeded.
      }
    }
  }

  await store.addNotification(
    handle,
    {
      type: "ai",
      actor: handle,
      postHandle: handle,
      postSlug: slug,
      body: "AI 总结已清除",
    },
    new Date(),
  );
  return { ok: true };
}
