import { getReadContentStore } from "@/content";

/** A published post, cross-backend, with the handle that owns it. */
export interface PublicPostRef {
  handle: string;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt?: string;
  tags: string[];
}

/**
 * Enumerate every published post across all creators. PostMeta doesn't carry
 * the owning handle, so we list handles first, then each creator's published
 * posts. Newest first.
 */
export async function listPublishedPosts(): Promise<PublicPostRef[]> {
  const store = await getReadContentStore();
  if (!store) return [];
  const handles = await store.listHandles();
  const refs: PublicPostRef[] = [];
  for (const handle of handles) {
    const posts = await store.listPosts({ handle, status: "published" });
    for (const p of posts) {
      refs.push({
        handle,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
        tags: p.tags,
      });
    }
  }
  refs.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return refs;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 document for the given published posts. */
export function buildFeedXml(posts: PublicPostRef[], baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const items = posts
    .map((p) => {
      const link = `${base}/@${p.handle}/${p.slug}`;
      const title = escapeXml(p.title);
      const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : "";
      const description = p.excerpt ? escapeXml(p.excerpt) : "";
      return [
        "    <item>",
        `      <title>${title}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
        description ? `      <description>${description}</description>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `  <channel>`,
    `    <title>sumi</title>`,
    `    <link>${base}</link>`,
    `    <description>Ink on paper, kept in Git.</description>`,
    `    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>`,
    items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}

/** Absolute URLs to include in the sitemap (home, creators, posts, tags). */
export function collectSitemapUrls(posts: PublicPostRef[], baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, "");
  const urls = [`${base}/`];
  for (const handle of [...new Set(posts.map((p) => p.handle))].sort()) {
    urls.push(`${base}/@${handle}`);
  }
  for (const p of posts) {
    urls.push(`${base}/@${p.handle}/${p.slug}`);
  }
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort();
  for (const tag of tags) {
    urls.push(`${base}/tag/${tag}`);
  }
  return urls;
}
