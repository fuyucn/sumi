"use server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { runDeletePost, runSavePost, type WriteDeps } from "./actions-core";
import type { WriteForm } from "@/content/post-input";

async function resolveDeps(): Promise<WriteDeps> {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const [handle, store] = userId
    ? await Promise.all([getUserHandle(userId), getContentStoreForUser(userId)])
    : [null, null];
  return { userId, handle, store };
}

export async function savePostAction(form: WriteForm) {
  "use server";
  return runSavePost(await resolveDeps(), form, new Date());
}

export async function deletePostAction(slug: string) {
  "use server";
  return runDeletePost(await resolveDeps(), slug);
}
