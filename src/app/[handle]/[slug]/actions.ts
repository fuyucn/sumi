"use server";

import { getReadContentStore } from "@/content";

/**
 * Count one page view for a published post. Fired once per real page load
 * from the client (see TrackView), so SSR/crawler renders don't inflate it.
 * Returns the new total so the byline can update in place.
 */
export async function trackPostViewAction(handle: string, slug: string): Promise<number> {
  const store = await getReadContentStore();
  if (!store) return 0;
  try {
    return await store.incrementViews(handle, slug);
  } catch {
    return 0;
  }
}
