"use server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getAgentContentStore, getReadContentStore } from "@/content";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAgent(handle: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to review agent drafts" };
  const rows = await db
    .select({ handle: agentKeys.agentHandle })
    .from(agentKeys)
    .where(eq(agentKeys.agentHandle, handle))
    .limit(1);
  if (!rows.length) return { ok: false, error: `@${handle} is not an agent handle` };
  return { ok: true };
}

async function getAgentDraft(handle: string, slug: string) {
  const readStore = await getReadContentStore();
  if (!readStore) return null;
  const post = await readStore.getPost(handle, slug);
  if (!post || post.status !== "draft") return null;
  return post;
}

export async function approveAgentDraftAction(handle: string, slug: string): Promise<ActionResult> {
  const guard = await requireAgent(handle);
  if (!guard.ok) return guard;

  const post = await getAgentDraft(handle, slug);
  if (!post) return { ok: false, error: "Draft not found or already published" };

  const store = await getAgentContentStore();
  if (!store) return { ok: false, error: "No write backend configured" };

  await store.savePost(handle, {
    title: post.title,
    body: post.body,
    tags: post.tags,
    ...(post.excerpt !== undefined ? { excerpt: post.excerpt } : {}),
    ...(post.coverImage !== undefined ? { coverImage: post.coverImage } : {}),
    status: "published",
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    agent: true,
  });
  return { ok: true };
}

export async function deleteAgentDraftAction(handle: string, slug: string): Promise<ActionResult> {
  const guard = await requireAgent(handle);
  if (!guard.ok) return guard;

  const post = await getAgentDraft(handle, slug);
  if (!post) return { ok: false, error: "Draft not found or already published" };

  const store = await getAgentContentStore();
  if (!store) return { ok: false, error: "No write backend configured" };

  await store.deletePost(handle, slug);
  return { ok: true };
}
