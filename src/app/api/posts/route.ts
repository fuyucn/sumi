import { NextRequest, NextResponse } from "next/server";
import { getReadContentStore } from "@/content";

/**
 * Public, read-only search API. Returns published posts matching `?q=`.
 * No auth needed — content is public. Used by the sumi MCP server
 * (mcp/index.mjs) so agents can avoid duplicate posts.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ ok: true, results: [] });

  const store = await getReadContentStore();
  if (!store) return NextResponse.json({ ok: true, results: [] });

  const results = await store.searchPosts(q);
  return NextResponse.json({ ok: true, results });
}
