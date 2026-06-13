import type { ContentStore } from "@/content/store";
import { buildNewPost } from "@/content/post-input";

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

export async function runDeletePost(deps: WriteDeps, slug: string): Promise<DeleteResult> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  await deps.store!.deletePost(deps.handle!, slug);
  return { ok: true };
}
