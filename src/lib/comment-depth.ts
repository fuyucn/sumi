import type { Comment } from "@/content/types";

/** Maximum comment nesting depth (1 = a root comment). Replies beyond this are rejected. */
export const MAX_COMMENT_DEPTH = 4;

/**
 * Depth of the comment with the given id (1 for a root, N for the Nth
 * ancestor chain). Walks parentId links; guards against cycles.
 */
export function commentDepth(comments: Comment[], id: string): number {
  const byId = new Map(comments.map((c) => [c.id, c]));
  let depth = 0;
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur) {
    depth += 1;
    if (!cur.parentId) break;
    if (seen.has(cur.id)) break; // cycle
    seen.add(cur.id);
    cur = byId.get(cur.parentId);
  }
  return depth;
}

/** Whether a reply to the given comment would stay within the max depth. */
export function replyAllowed(comments: Comment[], comment: Comment): boolean {
  return commentDepth(comments, comment.id) < MAX_COMMENT_DEPTH;
}