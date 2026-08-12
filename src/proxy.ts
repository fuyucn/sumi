import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Per-request security headers (Next 16 Proxy, the middleware replacement).
 *
 * A fresh CSP nonce is minted for every page render so Next.js can stamp its
 * framework/route scripts and our inline theme script without opening the
 * door to `'unsafe-inline'` scripts. API routes, static assets and prefetches
 * are excluded — they don't render HTML and don't need the policy.
 */
function isHttps(req: NextRequest): boolean {
  const fwd = req.headers.get("x-forwarded-proto");
  return req.nextUrl.protocol === "https:" || (fwd !== null && fwd.startsWith("https"));
}

export function proxy(req: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const dev = process.env.NODE_ENV === "development";
  const https = isHttps(req);

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline `style` attributes (React) are fine to allow; scripts stay nonce-gated.
    "style-src 'self' 'unsafe-inline'",
    // Covers GitHub avatars/user content, R2, /api/images and data/blob uploads.
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // The high-end design demo (public/demo-highend-*) loads its own plain
      // CSS/JS from /public; it is excluded from the nonce-gated policy.
      source: "/((?!api|_next/static|_next/image|favicon.ico|demo-highend).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
