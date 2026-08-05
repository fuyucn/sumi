import { NextRequest, NextResponse } from "next/server";
import { agentRequest, apiError } from "../shared";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { auth } = await agentRequest(req);
  if (!auth.ok) return apiError(401, auth.error);
  return NextResponse.json({ ok: true, agentHandle: auth.agentHandle, displayName: auth.displayName });
}