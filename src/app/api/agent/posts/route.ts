import { NextRequest, NextResponse } from "next/server";
import { getAgentContentStore } from "@/content";
import { buildNewPost } from "@/content/post-input";
import { agentPostSchema, toWriteForm, agentRequest, apiError } from "../shared";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { auth } = await agentRequest(req);
  if (!auth.ok) return apiError(401, auth.error);

  const store = await getAgentContentStore();
  if (!store) return apiError(503, "No content backend configured");

  const posts = await store.listPosts({ handle: auth.agentHandle });
  return NextResponse.json({ ok: true, agentHandle: auth.agentHandle, posts });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { auth, body } = await agentRequest(req);
  if (!auth.ok) return apiError(401, auth.error);

  const parsed = agentPostSchema.safeParse(JSON.parse(body || "{}") as unknown);
  if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Invalid body");

  const store = await getAgentContentStore();
  if (!store) return apiError(503, "No content backend configured");

  const newPost = { ...buildNewPost(toWriteForm(parsed.data), new Date()), agent: true };
  const slug = await store.savePost(auth.agentHandle, newPost);
  return NextResponse.json({ ok: true, slug, status: newPost.status }, { status: 201 });
}