import { env } from "@/lib/env";
import { buildFeedXml, listPublishedPosts } from "@/lib/public-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const posts = await listPublishedPosts();
  return new Response(buildFeedXml(posts, env.BETTER_AUTH_URL), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
