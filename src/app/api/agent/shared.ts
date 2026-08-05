import { z } from "zod";
import { NextResponse } from "next/server";

/** Agent write payload. `tags` accepts an array or a comma-separated string. */
export const agentPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().default(""),
  tags: z.array(z.string().trim()).or(z.string()).default([]),
  publish: z.boolean().default(false),
});

export type AgentPostInput = z.input<typeof agentPostSchema>;

/** Partial payload for updating an existing post (all fields optional). */
export const agentPostUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  body: z.string().optional(),
  tags: z.array(z.string().trim()).or(z.string()).optional(),
  publish: z.boolean().optional(),
});

export type AgentPostUpdateInput = z.input<typeof agentPostUpdateSchema>;

export function tagsToCommaString(tags: string | string[] | undefined, fallback: string): string {
  if (tags === undefined) return fallback;
  return Array.isArray(tags) ? tags.join(",") : tags;
}

/** Convert a validated agent payload into the WriteForm shape buildNewPost expects. */
export function toWriteForm(input: {
  title: string;
  body: string;
  tags: string | string[];
  publish: boolean;
}): { title: string; body: string; tags: string; publish: boolean } {
  return {
    title: input.title,
    body: input.body,
    tags: Array.isArray(input.tags) ? input.tags.join(",") : input.tags,
    publish: input.publish,
  };
}

export function apiError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}
