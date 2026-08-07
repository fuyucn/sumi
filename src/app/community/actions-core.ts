import { z } from "zod";
import type { Comment, Friend, Note, Profile } from "@/content/types";
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

export const projectFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(2000).default(""),
  url: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine((u) => u === "" || /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
  repo: z.string().trim().max(500).default(""),
  tech: z.array(z.string().trim().min(1)).default([]),
  coverImage: z.string().trim().max(500).default(""),
  featured: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const pageFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).default(""),
  body: z.string().trim().min(1, "Content is required").max(100_000),
  showInNav: z.boolean().default(false),
});

export const likeFormSchema = z.object({
  postHandle: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

export const followFormSchema = z.object({
  followee: z.string().trim().min(1),
});

export const deleteCommentFormSchema = z.object({
  postHandle: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  commentId: z.string().trim().min(1),
});

export const noteFormSchema = z.object({
  body: z.string().trim().min(1, "Note is required").max(2000),
});

export const deleteNoteFormSchema = z.object({
  id: z.string().trim().min(1),
});

export const friendFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  url: z.string().trim().min(1, "URL is required").max(500).refine(
    (u) => /^https?:\/\//i.test(u),
    "URL must start with http:// or https://",
  ),
  avatar: z.string().trim().max(500).default(""),
  bio: z.string().trim().max(300).default(""),
});

export const deleteFriendFormSchema = z.object({
  id: z.string().trim().min(1),
});

/** Delete a comment. Allowed for the comment's own author or the post's author. */
export async function runDeleteComment(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ deleted: string }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = deleteCommentFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const comments = await deps.store!.listComments(f.postHandle, f.slug);
  const comment = comments.find((c) => c.id === f.commentId);
  if (!comment) return { ok: false, error: "Comment not found" };
  const isPostAuthor = f.postHandle === deps.handle;
  if (comment.handle !== deps.handle && !isPostAuthor) {
    return { ok: false, error: "You can only delete your own comments or comments on your posts" };
  }
  await deps.store!.deleteComment(f.postHandle, f.slug, f.commentId);
  return { ok: true, data: { deleted: f.commentId } };
}

/** Publish a short note (手记) to the signed-in creator's timeline. */
export async function runAddNote(
  deps: SessionDeps,
  form: unknown,
  now: Date,
): Promise<ActionResult<Note>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = noteFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const note = await deps.store!.addNote(deps.handle!, { body: f.body }, now);
  return { ok: true, data: note };
}

/** Delete one of the signed-in creator's notes. */
export async function runDeleteNote(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ deleted: string }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = deleteNoteFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  await deps.store!.deleteNote(deps.handle!, f.id);
  return { ok: true, data: { deleted: f.id } };
}

/** Add a friend link (友链) to the site-wide friends page. */
export async function runAddFriend(
  deps: SessionDeps,
  form: unknown,
  now: Date,
): Promise<ActionResult<Friend>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = friendFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const friend = await deps.store!.addFriend(
    {
      name: f.name,
      url: f.url,
      ...(f.avatar ? { avatar: f.avatar } : {}),
      ...(f.bio ? { bio: f.bio } : {}),
    },
    now,
  );
  return { ok: true, data: friend };
}

/** Remove a friend link. */
export async function runDeleteFriend(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ deleted: string }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = deleteFriendFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  await deps.store!.deleteFriend(f.id);
  return { ok: true, data: { deleted: f.id } };
}

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

export async function runSaveProject(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = projectFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const slug = await deps.store!.saveProject(deps.handle!, {
    title: f.title,
    tech: f.tech,
    featured: f.featured,
    order: f.order,
    ...(f.description ? { description: f.description } : {}),
    ...(f.url ? { url: f.url } : {}),
    ...(f.repo ? { repo: f.repo } : {}),
    ...(f.coverImage ? { coverImage: f.coverImage } : {}),
  });
  return { ok: true, data: { slug } };
}

export async function runDeleteProject(deps: SessionDeps, slug: string): Promise<ActionResult<null>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  if (!slug) return { ok: false, error: "Missing project slug." };
  await deps.store!.deleteProject(deps.handle!, slug);
  return { ok: true, data: null };
}

export async function runSavePage(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = pageFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const slug = await deps.store!.savePage(deps.handle!, {
    title: f.title,
    body: f.body,
    showInNav: f.showInNav,
    ...(f.description ? { description: f.description } : {}),
  });
  return { ok: true, data: { slug } };
}

export async function runDeletePage(deps: SessionDeps, slug: string): Promise<ActionResult<null>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  if (!slug) return { ok: false, error: "Missing page slug." };
  await deps.store!.deletePage(deps.handle!, slug);
  return { ok: true, data: null };
}

/** Like or unlike a post as the signed-in creator. Returns the new like count. */
export async function runToggleLike(
  deps: SessionDeps,
  form: unknown,
  now: Date,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = likeFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const handle = deps.handle!;
  const current = await deps.store!.listLikes(f.postHandle, f.slug);
  const liked = current.includes(handle);
  if (liked) {
    await deps.store!.removeLike(f.postHandle, f.slug, handle);
  } else {
    await deps.store!.addLike(f.postHandle, f.slug, handle, now);
  }
  return { ok: true, data: { liked: !liked, count: liked ? current.length - 1 : current.length + 1 } };
}

/** Read the current like state for a signed-in user without mutating. */
export async function runGetLikeState(
  deps: SessionDeps,
  form: unknown,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = likeFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const current = await deps.store!.listLikes(f.postHandle, f.slug);
  return { ok: true, data: { liked: current.includes(deps.handle!), count: current.length } };
}

/** Follow or unfollow a creator. Cannot follow yourself. Returns new follower count of the followee. */
export async function runToggleFollow(
  deps: SessionDeps,
  form: unknown,
  now: Date,
): Promise<ActionResult<{ following: boolean; count: number }>> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let f;
  try {
    f = followFormSchema.parse(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const me = deps.handle!;
  if (me === f.followee) return { ok: false, error: "You cannot follow yourself." };
  const followee = f.followee;
  const following = (await deps.store!.listFollowing(me)).includes(followee);
  if (following) await deps.store!.removeFollow(me, followee);
  else await deps.store!.addFollow(me, followee, now);
  const count = (await deps.store!.listFollowers(followee)).length;
  return { ok: true, data: { following: !following, count } };
}
