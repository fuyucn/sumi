/**
 * Shared relevance ranking for full-text search across all content backends.
 * Title match counts most, then tags, then excerpt, then body. Ties break by
 * recency (publishedAt, else createdAt), newest first. Zero-score rows drop out.
 */
export interface RankablePost {
  title: string;
  body?: string;
  excerpt?: string | null;
  tags: string[];
  publishedAt?: string | null;
  createdAt?: string | null;
}

export function scorePost(row: RankablePost, needle: string): number {
  const q = needle.trim().toLowerCase();
  const title = (row.title ?? "").toLowerCase();
  const excerpt = (row.excerpt ?? "").toLowerCase();
  const body = (row.body ?? "").toLowerCase();
  let score = 0;
  if (title === q) score += 8; // exact title match
  else if (title.includes(q)) score += 5;
  if (row.tags.some((t) => t.toLowerCase().includes(q))) score += 3;
  if (excerpt.includes(q)) score += 2;
  if (body.includes(q)) score += 1;
  return score;
}

export function rankRows<T extends { rank: RankablePost }>(items: T[], needle: string): T[] {
  const q = needle.trim().toLowerCase();
  return items
    .map((item) => ({
      item,
      score: scorePost(item.rank, q),
      ts: item.rank.publishedAt ?? item.rank.createdAt ?? "",
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.ts > a.ts ? 1 : b.ts < a.ts ? -1 : 0))
    .map((x) => x.item);
}