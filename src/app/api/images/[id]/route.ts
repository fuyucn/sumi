import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sumiImages } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Serves images stored by the Postgres mirror backend (DbContentStore).
 * Images are public content, so this route is unauthenticated — same as the
 * GitHub / R2 object stores they replace.
 */
export async function GET(req: NextRequest, { params }: RouteContext): Promise<Response> {
  void req;
  const { id } = await params;
  const rows = await db.select().from(sumiImages).where(eq(sumiImages.id, id)).limit(1);
  const row = rows[0];
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
