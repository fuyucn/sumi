import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent, type AgentAuth } from "@/lib/agent-auth";

/** Agent write payload. `tags` accepts an array or a comma-separated string. */
export const agentPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().default(""),
  tags: z.array(z.string().trim()).or(z.string()).default([]),
  publish: z.boolean().default(false),
  coverImage: z.string().optional(),
});

export type AgentPostInput = z.input<typeof agentPostSchema>;

/** Partial payload for updating an existing post (all fields optional). */
export const agentPostUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  body: z.string().optional(),
  tags: z.array(z.string().trim()).or(z.string()).optional(),
  publish: z.boolean().optional(),
  coverImage: z.string().optional(),
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
  coverImage?: string;
}): { title: string; body: string; tags: string; publish: boolean; coverImage?: string } {
  return {
    title: input.title,
    body: input.body,
    tags: Array.isArray(input.tags) ? input.tags.join(",") : input.tags,
    publish: input.publish,
    ...(input.coverImage ? { coverImage: input.coverImage } : {}),
  };
}

export function apiError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Read the raw body once (needed to verify the request signature over the
 * exact bytes), then authenticate the bearer + signature. Returns the auth
 * result and the raw body text for the handler to parse.
 */
export async function agentRequest(
  req: NextRequest,
): Promise<{ auth: AgentAuth; body: string }> {
  const body = await req.text();
  const auth = await authenticateAgent({
    method: req.method,
    pathname: req.nextUrl.pathname,
    body,
    authorization: req.headers.get("authorization"),
    signature: req.headers.get("x-agent-signature"),
    timestamp: req.headers.get("x-agent-timestamp"),
  });
  return { auth, body };
}
