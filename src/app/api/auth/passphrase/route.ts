import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { AUTH_LIMIT, rateLimit } from "@/lib/rate-limit";
import {
  hasValidPassphraseCookie,
  passphraseCookieOptions,
  passphraseMatches,
  passphraseToken,
  PASS_COOKIE,
} from "@/lib/passphrase";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const own = env.BETTER_AUTH_URL.replace(/\/+$/, "");
  if (origin === own) return true;
  const extra = env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

function json(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, { status });
}

/** Status probe used by the sign-in page: is a passphrase configured and unlocked? */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!env.LOGIN_PASSPHRASE) return json(200, { required: false, unlocked: false });
  const unlocked = hasValidPassphraseCookie(
    req.headers.get("cookie"),
    env.LOGIN_PASSPHRASE,
    env.BETTER_AUTH_SECRET,
  );
  return json(200, { required: true, unlocked });
}

/** Unlock sign-in: validates the passphrase and issues a 30-day owner cookie. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!env.LOGIN_PASSPHRASE) return json(404, { ok: false, error: "未启用" });

  const { allowed } = rateLimit(`passphrase:${clientIp(req)}`, AUTH_LIMIT);
  if (!allowed) return json(429, { ok: false, error: "尝试过于频繁，请稍后再试" });
  if (!originAllowed(req)) return json(403, { ok: false, error: "非法来源" });

  let body: { passphrase?: unknown };
  try {
    body = (await req.json()) as { passphrase?: unknown };
  } catch {
    return json(400, { ok: false, error: "请求格式错误" });
  }
  if (typeof body.passphrase !== "string") {
    return json(400, { ok: false, error: "请求格式错误" });
  }

  if (!passphraseMatches(body.passphrase, env.LOGIN_PASSPHRASE, env.BETTER_AUTH_SECRET)) {
    return json(401, { ok: false, error: "口令不正确" });
  }

  const res = json(200, { ok: true });
  res.cookies.set(
    PASS_COOKIE,
    passphraseToken(env.LOGIN_PASSPHRASE, env.BETTER_AUTH_SECRET),
    passphraseCookieOptions(env.BETTER_AUTH_URL.startsWith("https://")),
  );
  return res;
}
