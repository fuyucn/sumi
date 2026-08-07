"use server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import { getAiStore, getContentStoreForUser, getReadContentStore } from "@/content";
import { runDeletePost, runSavePost, runUploadImage, type WriteDeps } from "./actions-core";
import { generateSummary } from "@/lib/ai/summarize";
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

/**
 * Author-only, synchronous one-click AI 导读 generation from the editor.
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
        body: "AI 导读未生成：未配置 AI provider（Settings → AI 导读）",
      },
      new Date(),
    );
    return { ok: false, error: "未配置 AI provider：请到 Settings → AI 导读 中启用" };
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
        body: `AI 导读已生成（${provider.model}）`,
      },
      now,
    );
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
        body: `AI 导读生成失败：${message.slice(0, 300)}`,
      },
      now,
    );
    return { ok: false, error: message.slice(0, 500) };
  }

  const done = await aiStore.getTask(taskHandle, slug);
  return done ? { ok: true, task: done } : { ok: false, error: "生成结果读取失败，请重试" };
}
