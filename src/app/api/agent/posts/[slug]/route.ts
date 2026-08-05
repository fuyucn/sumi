import { NextRequest, NextResponse } from "next/server";
import { getAgentContentStore } from "@/content";
import { buildNewPost } from "@/content/post-input";
import { agentPostUpdateSchema, tagsToCommaString, agentRequest, apiError } from "../../shared";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { auth, body } = await agentRequest(req);
  if (!auth.ok) return apiError(401, auth.error);

  const { slug } = await params;
  const parsed = agentPostUpdateSchema.safeParse(JSON.parse(body || "{}") as unknown);
  if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Invalid body");

  const store = await getAgentContentStore();
  if (!store) return apiError(503, "No content backend configured");

  const existing = await store.getPost(auth.agentHandle, slug);
  if (!existing) return apiError(404, `No post ${auth.agentHandle}/${slug}`);

  const merged = {
    title: parsed.data.title ?? existing.title,
    body: parsed.data.body ?? existing.body,
    tags: tagsToCommaString(parsed.data.tags, existing.tags.join(",")),
    publish: parsed.data.publish ?? existing.status === "published",
    publishedAt: existing.publishedAt,
  };
  const newPost = { ...buildNewPost(merged, new Date()), agent: true };
  const newSlug = await store.savePost(auth.agentHandle, newPost);
  return NextResponse.json({ ok: true, slug: newSlug, status: newPost.status });
}

export async function DELETE(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { auth } = await agentRequest(req);
  if (!auth.ok) return apiError(401, auth.error);

  const { slug } = await params;
  const store = await getAgentContentStore();
  if (!store) return apiError(503, "No content backend configured");

  const existing = await store.getPost(auth.agentHandle, slug);
  if (!existing) return apiError(404, `No post ${auth.agentHandle}/${slug}`);

  await store.deletePost(auth.agentHandle, slug);
  return NextResponse.json({ ok: true, deleted: `${auth.agentHandle}/${slug}` });
}