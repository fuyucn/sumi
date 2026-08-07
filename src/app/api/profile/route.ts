import { NextRequest, NextResponse } from "next/server";
import { getReadContentStore } from "@/content";

export const dynamic = "force-dynamic";

/**
 * Public, read-only profile lookup. Returns the profile (displayName/bio) for a
 * handle. Used by client components (e.g. the nav) that can't query the content
 * store directly.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const handle = req.nextUrl.searchParams.get("handle")?.trim() ?? "";
  if (!handle) return NextResponse.json({ ok: false, error: "handle required" }, { status: 400 });
  const store = await getReadContentStore();
  const profile = (await store?.getProfile(handle)) ?? null;
  return NextResponse.json({ ok: true, profile });
}
