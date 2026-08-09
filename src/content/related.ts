import type { ContentStore } from "./store";
import type { PostMeta } from "./types";

export interface RelatedItem {
  handle: string;
  post: PostMeta;
}

export interface RelatedPick {
  items: RelatedItem[];
  byTag: boolean;
}

/**
 * Related posts by shared tags, newest first among equal scores. Falls back to
 * the latest posts when fewer than two candidates share a tag, and always
 * excludes the article being read.
 */
export function pickRelated(
  feed: RelatedItem[],
  handle: string,
  slug: string,
  tags: string[],
): RelatedPick {
  const others = feed.filter(
    (f) => !(f.handle === handle && f.post.slug === slug),
  );
  const scored = others
    .map((f) => ({
      ...f,
      shared: f.post.tags.filter((t) => tags.includes(t)).length,
    }))
    .filter((f) => f.shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        (b.post.publishedAt ?? "").localeCompare(a.post.publishedAt ?? ""),
    );
  if (scored.length >= 2) {
    return { items: scored.slice(0, 3), byTag: true };
  }
  const latest = [...others]
    .sort((a, b) =>
      (b.post.publishedAt ?? "").localeCompare(a.post.publishedAt ?? ""),
    )
    .slice(0, 3);
  return { items: latest, byTag: false };
}

/** Convenience for pages: builds the full feed and picks related posts. */
export async function relatedFromStore(
  store: ContentStore | null,
  handle: string,
  slug: string,
  tags: string[],
): Promise<RelatedPick> {
  if (!store) return { items: [], byTag: false };
  const feed: RelatedItem[] = [];
  for (const h of await store.listHandles()) {
    for (const post of await store.listPosts({ handle: h, status: "published" })) {
      feed.push({ handle: h, post });
    }
  }
  return pickRelated(feed, handle, slug, tags);
}
