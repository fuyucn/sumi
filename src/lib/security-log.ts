/**
 * Structured audit logging for security-relevant events. Emits a single
 * machine-greppable line to stderr so Docker/VPS/Cloudflare logs can be
 * watched or shipped without a separate sink.
 */

export type SecurityEvent =
  | {
      event: "login-denied";
      /** GitHub login that was rejected by the allowlist. */
      login: string;
      ip: string | null;
      path: string | null;
    }
  | {
      event: "auth-rate-limited";
      ip: string | null;
      path: string | null;
    };

/** Best-effort client IP from the proxy headers the runtime forwards. */
export function clientIpFromRequest(req: Request | null | undefined): string | null {
  if (!req) return null;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

export function logSecurityEvent(ev: SecurityEvent): void {
  const parts = [`[security]`, `event=${ev.event}`];
  if (ev.event === "login-denied") parts.push(`login=${JSON.stringify(ev.login)}`);
  if (ev.ip) parts.push(`ip=${JSON.stringify(ev.ip)}`);
  if (ev.path) parts.push(`path=${JSON.stringify(ev.path)}`);
  console.warn(parts.join(" "));
}
