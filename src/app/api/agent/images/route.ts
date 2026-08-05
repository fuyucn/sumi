import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentContentStore } from "@/content";
import { agentRequest, apiError } from "../shared";
import { safeImageName, slugify } from "@/content/paths";

const MAX_BYTES = 10 * 1024 * 1024;

const uploadSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  filename: z.string().trim().min(1, "Filename is required").max(255),
  /** Base64 bytes, optionally prefixed with a data: URL (`data:image/png;base64,`). */
  data: z.string().min(1, "Data is required"),
});

/**
 * Upload an image for a post. Returns a path the agent can pass as
 * `coverImage` or embed in markdown so the rendered page resolves it.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { auth, body } = await agentRequest(req);
  if (!auth.ok) return apiError(401, auth.error);

  const parsed = uploadSchema.safeParse(JSON.parse(body || "{}") as unknown);
  if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Invalid body");

  const store = await getAgentContentStore();
  if (!store) return apiError(503, "No content backend configured");

  const { title, filename, data } = parsed.data;
  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(base64)) return apiError(400, "Data is not valid base64");

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  } catch {
    return apiError(400, "Data is not valid base64");
  }
  if (bytes.byteLength === 0) return apiError(400, "Decoded image is empty");
  if (bytes.byteLength > MAX_BYTES) return apiError(413, `Image exceeds ${MAX_BYTES} bytes`);

  const slug = slugify(title);
  const safeName = safeImageName(filename);
  try {
    const path = await store.uploadImage(auth.agentHandle, slug, safeName, bytes);
    return NextResponse.json({ ok: true, path }, { status: 201 });
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : "Image upload failed");
  }
}