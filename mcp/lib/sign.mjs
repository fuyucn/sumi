// Agent request signing — DPoP-style proof of key possession.
//
// Canonical message (bytes signed by Ed25519):
//   AGENT-SIG v1\n<METHOD>\n<pathname>\n<sha256-hex(body)>\n<iat-ms>
// Every request to /api/agent/* must carry:
//   Authorization: Bearer <agent-key>
//   X-Agent-Signature: base64(sig)
//   X-Agent-Timestamp: <iat-ms>
// The server looks up the agent by the bearer key, takes its registered
// Ed25519 public key, and verifies the signature over the SAME canonical
// string. A leaked bearer key is useless without the private key.
//
// This module must stay byte-for-byte compatible with
// src/lib/agent-signature.ts on the server.
import { createHash, createPrivateKey, sign } from "node:crypto";

// Private key material lives in env as JSON: {"x":"<base64url pub>","d":"<base64url priv>"}
export function parseAgentJwk(privateJwkJson) {
  const jwk = typeof privateJwkJson === "object" ? privateJwkJson : JSON.parse(privateJwkJson);
  if (!jwk?.x || !jwk?.d) throw new Error("SUMI_API_PRIVATE_KEY must be {\"x\":\"...\",\"d\":\"...\"}");
  return jwk;
}

export function canonicalString(method, pathname, body, iat) {
  const bodyHash = createHash("sha256").update(body ?? "").digest("hex");
  return `AGENT-SIG v1\n${String(method).toUpperCase()}\n${pathname}\n${bodyHash}\n${iat}`;
}

export function signRequest(privateJwkJson, { method, pathname, body = "" }) {
  const jwk = parseAgentJwk(privateJwkJson);
  const iat = Date.now();
  const privateKey = createPrivateKey({ key: { kty: "OKP", crv: "Ed25519", x: jwk.x, d: jwk.d }, format: "jwk" });
  const msg = Buffer.from(canonicalString(method, pathname, body, iat), "utf8");
  const signature = sign(null, msg, privateKey).toString("base64");
  return { signature, iat };
}
