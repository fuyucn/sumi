import { createHash, createPublicKey, verify } from "node:crypto";

/**
 * Server-side mirror of mcp/lib/sign.mjs. Keeps the canonical string
 * byte-for-byte identical — do not edit one without the other.
 *
 * Canonical message signed by the agent's Ed25519 private key:
 *   AGENT-SIG v1\n<METHOD>\n<pathname>\n<sha256-hex(body)>\n<iat-ms>
 */
export const SIGNATURE_VERSION = "AGENT-SIG v1";
export const SIGNATURE_WINDOW_MS = 60_000;

export function canonicalString(method: string, pathname: string, body: string, iat: string): string {
  const bodyHash = createHash("sha256").update(body ?? "").digest("hex");
  return `${SIGNATURE_VERSION}\n${method.toUpperCase()}\n${pathname}\n${bodyHash}\n${iat}`;
}

/** Verify an Ed25519 signature against a registered public key (base64url `x`). */
export function verifySignature(
  publicKeyB64url: string,
  signatureB64: string,
  method: string,
  pathname: string,
  body: string,
  iat: string,
): boolean {
  try {
    const publicKey = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: publicKeyB64url }, format: "jwk" });
    const msg = Buffer.from(canonicalString(method, pathname, body, iat), "utf8");
    const sig = Buffer.from(signatureB64, "base64");
    return verify(null, msg, publicKey, sig);
  } catch {
    return false;
  }
}

/** Reject requests whose timestamp is too old/new (replay + clock skew protection). */
export function timestampInWindow(iatRaw: string | null, now = Date.now()): boolean {
  const iat = Number(iatRaw);
  if (!Number.isFinite(iat)) return false;
  return Math.abs(now - iat) <= SIGNATURE_WINDOW_MS;
}
