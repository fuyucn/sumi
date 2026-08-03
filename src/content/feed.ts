import type { ContentStore } from "./store";
import type { PostMeta } from "./types";

export interface FeedItem {
  handle: string;
  post: PostMeta;
}

/** Published posts across all creators, newest first. */
export async function feedFromStore(store: ContentStore | null): Promise<FeedItem[]> {
  if (!store) return [];
  const items: FeedItem[] = [];
  for (const handle of await store.listHandles()) {
    for (const post of await store.listPosts({ handle, status: "published" })) {
      items.push({ handle, post });
    }
  }
  items.sort((a, b) => (b.post.publishedAt ?? "").localeCompare(a.post.publishedAt ?? ""));
  return items;
}

/** Convenience for pages: builds the feed from the read store. */
export async function listFeed(): Promise<FeedItem[]> {
  const { getReadContentStore } = await import("./index");
  return feedFromStore(await getReadContentStore());
}
