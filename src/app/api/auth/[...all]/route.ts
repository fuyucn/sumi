import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { AUTH_LIMIT, rateLimit } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const GET = (req: Request) => handler.GET(req);

export const POST = (req: Request) => {
  // Safety valve: cap auth POSTs (sign-in / sign-out / session refresh) per IP
  // so an abused GitHub OAuth flow can't hammer the session endpoints.
  const { allowed } = rateLimit(`auth:${clientIp(req)}`, AUTH_LIMIT);
  if (!allowed) {
    return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }
  return handler.POST(req);
};
