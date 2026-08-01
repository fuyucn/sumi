import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import type { ContentStore } from "@/content/store";

export interface SessionDeps {
  userId: string | null;
  handle: string | null;
  store: ContentStore | null;
}

/** Resolve the signed-in user's id, handle, and content store (no I/O on the store). */
export async function resolveDeps(): Promise<SessionDeps> {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const [handle, store] = userId
    ? await Promise.all([getUserHandle(userId), getContentStoreForUser(userId)])
    : [null, null];
  return { userId, handle, store };
}

/** Shared auth + config guard. Returns an error message, or null when allowed. */
export function guard(deps: SessionDeps): string | null {
  if (!deps.userId) return "You must be signed in.";
  if (!deps.handle) return "Your account has no handle.";
  if (!deps.store) return "Content repository is not configured.";
  return null;
}
