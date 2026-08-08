import { z } from "zod";
import { firstSentence } from "@/lib/first-sentence";
import type { NewPost } from "./types";

export const writeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().default(""),
  excerpt: z.string().max(300).default(""),
  tags: z.string().default(""),
  publish: z.boolean().default(false),
  publishedAt: z.string().optional(),
  coverImage: z.string().optional(),
  agent: z.boolean().optional(),
});

export type WriteForm = z.input<typeof writeFormSchema>;

/** Validate a write form and build a NewPost. `now` is injected for testability. */
export function buildNewPost(form: unknown, now: Date): NewPost {
  const f = writeFormSchema.parse(form);
  const tags = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
  const existing = f.publishedAt;
  const publishedAt = f.publish ? (existing ?? now.toISOString()) : existing;
  // 导读优先用手写值；留空时先用正文首句兜底，之后 AI 总结的 TL;DR 会替换它。
  const excerpt = f.excerpt.trim() ? f.excerpt.trim() : firstSentence(f.body);
  return {
    title: f.title,
    body: f.body,
    ...(excerpt ? { excerpt } : {}),
    tags,
    status: f.publish ? "published" : "draft",
    ...(f.agent ? { agent: true } : {}),
    ...(f.coverImage ? { coverImage: f.coverImage } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  };
}
