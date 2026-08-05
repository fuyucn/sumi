import { z } from "zod";
import type { Comment, Profile } from "@/content/types";
import { guard, type SessionDeps } from "@/lib/session";
import { commentDepth, MAX_COMMENT_DEPTH } from "@/lib/comment-depth";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const commentFormSchema = z.object({
  postHandle: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  body: z.string().trim().min(1, "Comment is required").max(4000),
  parentId: z.string().trim().optional(),
});

export const profileFormSchema = z.object({
  displayName: z.string().trim().max(80).default(""),
  bio: z.string().trim().max(2000).default(""),
});

export const magazineFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).default(""),
  items: z.array(z.string().trim().min(1)).default([]),
});

export async function runAddComment(
  deps: SessionDeps,
  form: unknown,
  now: Date,
): Promise<ActionResult<Comment>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = commentFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }

  // Reject replies that would exceed the max nesting depth (or reference a
  // comment that no longer exists). Runs on the server so it holds across all
  // backends, not just whatever the UI renders.
  if (f.parentId) {
    const existing = await deps.store!.listComments(f.postHandle, f.slug);
    const parent = existing.find((c) => c.id === f.parentId);
    if (!parent) {
      return { ok: false, error: "Comment you are replying to no longer exists" };
    }
    if (commentDepth(existing, f.parentId) >= MAX_COMMENT_DEPTH) {
      return { ok: false, error: `Comments nest to a maximum depth of ${MAX_COMMENT_DEPTH} levels` };
    }
  }

  const comment = await deps.store!.addComment(
    f.postHandle,
    f.slug,
    { body: f.body, ...(f.parentId ? { parentId: f.parentId } : {}) },
    deps.handle!,
    now,
  );
  return { ok: true, data: comment };
}

export async function runSaveProfile(deps: SessionDeps, form: unknown): Promise<ActionResult<Profile>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = profileFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const profile: Profile = {};
  if (f.displayName) profile.displayName = f.displayName;
  if (f.bio) profile.bio = f.bio;
  await deps.store!.saveProfile(deps.handle!, profile);
  return { ok: true, data: profile };
}

export async function runSaveMagazine(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = magazineFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const slug = await deps.store!.saveMagazine(deps.handle!, {
    title: f.title,
    ...(f.description ? { description: f.description } : {}),
    items: f.items,
  });
  return { ok: true, data: { slug } };
}

export async function runDeleteMagazine(deps: SessionDeps, slug: string): Promise<ActionResult<null>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  if (!slug) return { ok: false, error: "Missing magazine slug." };
  await deps.store!.deleteMagazine(deps.handle!, slug);
  return { ok: true, data: null };
}
