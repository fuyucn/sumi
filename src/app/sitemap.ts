import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { collectSitemapUrls, listPublishedPosts } from "@/lib/public-posts";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "");
  const posts = await listPublishedPosts();
  return collectSitemapUrls(posts, base).map((url) => ({
    url,
    changeFrequency: url === `${base}/` ? "daily" : "weekly",
    priority: url === `${base}/` ? 1 : 0.6,
  }));
}
