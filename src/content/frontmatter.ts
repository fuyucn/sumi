import matter from "gray-matter";
import type { Post, PostMeta, PostStatus } from "./types";

export function serializePost(post: Post): string {
  const data: Record<string, unknown> = {
    title: post.title,
    tags: post.tags,
    status: post.status,
  };
  if (post.excerpt !== undefined) data.excerpt = post.excerpt;
  if (post.coverImage !== undefined) data.coverImage = post.coverImage;
  if (post.publishedAt !== undefined) data.publishedAt = post.publishedAt;
  return matter.stringify(post.body, data);
}

export function parsePost(md: string, slug: string): Post {
  const { data, content } = matter(md);
  const status: PostStatus = data.status === "published" ? "published" : "draft";
  const meta: PostMeta = {
    title: typeof data.title === "string" ? data.title : "",
    slug,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status,
    ...(typeof data.excerpt === "string" ? { excerpt: data.excerpt } : {}),
    ...(typeof data.coverImage === "string" ? { coverImage: data.coverImage } : {}),
    ...(typeof data.publishedAt === "string" ? { publishedAt: data.publishedAt } : {}),
  };
  return { ...meta, body: content };
}
