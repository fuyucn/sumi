import type { ContentStore } from "@/content/store";
import { buildNewPost } from "@/content/post-input";
import { slugify, safeImageName } from "@/content/paths";

export interface WriteDeps {
  userId: string | null;
  handle: string | null;
  store: ContentStore | null;
}
export type SaveResult = { ok: true; slug: string } | { ok: false; error: string };
export type DeleteResult = { ok: true } | { ok: false; error: string };

function guard(deps: WriteDeps): string | null {
  if (!deps.userId) return "You must be signed in.";
  if (!deps.handle) return "Your account has no handle.";
  if (!deps.store) return "Content repository is not configured.";
  return null;
}

export async function runSavePost(deps: WriteDeps, form: unknown, now: Date): Promise<SaveResult> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let post;
  try {
    post = buildNewPost(form, now);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const slug = await deps.store!.savePost(deps.handle!, post);
  return { ok: true, slug };
}

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

export async function runUploadImage(
  deps: WriteDeps,
  input: { title: string; filename: string; bytes: Uint8Array },
): Promise<UploadResult> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  if (!input.title.trim()) return { ok: false, error: "Add a title before uploading images." };
  const slug = slugify(input.title);
  const safe = safeImageName(input.filename);
  const path = await deps.store!.uploadImage(deps.handle!, slug, safe, input.bytes);
  return { ok: true, path };
}

export async function runDeletePost(deps: WriteDeps, slug: string): Promise<DeleteResult> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  await deps.store!.deletePost(deps.handle!, slug);
  return { ok: true };
}
