import { createHmac, timingSafeEqual } from "node:crypto";

export const PASS_COOKIE = "sumi_owner";
const ISSUE_PREFIX = "owner:v1:";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function digest(passphrase: string, masterSecret: string): Buffer {
  return createHmac("sha256", `sumi:passphrase:v1:${masterSecret}`).update(passphrase).digest();
}

/** Constant-time comparison of the configured passphrase against user input. */
export function passphraseMatches(input: string, configured: string, masterSecret: string): boolean {
  const a = digest(input, masterSecret);
  const b = digest(configured, masterSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Issue the owner cookie value for a valid passphrase. */
export function passphraseToken(passphrase: string, masterSecret: string): string {
  return `${ISSUE_PREFIX}${digest(passphrase, masterSecret).toString("base64")}`;
}

export function verifyPassphraseToken(token: string, passphrase: string, masterSecret: string): boolean {
  if (!token.startsWith(ISSUE_PREFIX)) return false;
  const expected = Buffer.from(`${ISSUE_PREFIX}${digest(passphrase, masterSecret).toString("base64")}`);
  const actual = Buffer.from(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True when a raw Cookie header carries a valid owner token. */
export function hasValidPassphraseCookie(
  cookieHeader: string | null | undefined,
  passphrase: string,
  masterSecret: string,
): boolean {
  if (!cookieHeader) return false;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name !== PASS_COOKIE) continue;
    try {
      if (verifyPassphraseToken(decodeURIComponent(part.slice(eq + 1)), passphrase, masterSecret)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function passphraseCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure,
  };
}
