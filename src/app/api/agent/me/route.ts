import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import { apiError } from "../shared";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req.headers.get("authorization"));
  if (!auth.ok) return apiError(401, auth.error);
  return NextResponse.json({ ok: true, agentHandle: auth.agentHandle, displayName: auth.displayName });
}