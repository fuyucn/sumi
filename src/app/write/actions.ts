"use server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser, getReadContentStore } from "@/content";
import { runDeletePost, runSavePost, runUploadImage, type WriteDeps } from "./actions-core";
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

export async function savePostAction(form: WriteForm) {
  "use server";
  return runSavePost(await resolveDeps(), form, new Date());
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
