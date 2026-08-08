import { NextRequest, NextResponse } from "next/server";
import { getAiStore } from "@/content";
import { AI_TASK_LIMIT, rateLimit } from "@/lib/rate-limit";

/**
 * Public read-only polling endpoint for the AI 导读 panel on a post page.
 * Returns the latest summary task state for (handle, slug); the panel never
 * exposes the provider config or API key.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const handle = req.nextUrl.searchParams.get("handle") ?? "";
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!handle || !slug) return NextResponse.json({ ok: false, error: "handle and slug required" }, { status: 400 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { allowed, remaining } = rateLimit(`ai-task:${ip}`, AI_TASK_LIMIT);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const aiStore = await getAiStore();
  if (!aiStore) return NextResponse.json({ ok: true, task: null });

  const task = await aiStore.getTask(handle, slug);
  return NextResponse.json({ ok: true, task, remaining });
}
