import { z } from "zod";
import type { NewPost } from "./types";

export const writeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().default(""),
  tags: z.string().default(""),
  publish: z.boolean().default(false),
});

export type WriteForm = z.input<typeof writeFormSchema>;

/** Validate a write form and build a NewPost. `now` is injected for testability. */
export function buildNewPost(form: unknown, now: Date): NewPost {
  const f = writeFormSchema.parse(form);
  const tags = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
  return {
    title: f.title,
    body: f.body,
    tags,
    status: f.publish ? "published" : "draft",
    ...(f.publish ? { publishedAt: now.toISOString() } : {}),
  };
}
