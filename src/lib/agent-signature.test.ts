import { generateKeyPairSync } from "node:crypto";
import { expect, test } from "vitest";
import { signRequest } from "../../mcp/lib/sign.mjs";
import { canonicalString, timestampInWindow, verifySignature } from "./agent-signature";

function makeJwk() {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ format: "jwk" }) as { x: string; d: string };
}

test("client-signed request verifies with the server module (cross-compat)", () => {
  const jwk = makeJwk();
  const body = JSON.stringify({ title: "T", body: "B", tags: ["a"], publish: false });
  const { signature, iat } = signRequest(jwk, { method: "POST", pathname: "/api/agent/posts", body });

  expect(verifySignature(jwk.x, signature, "POST", "/api/agent/posts", body, String(iat))).toBe(true);
});

test("tampered body fails verification", () => {
  const jwk = makeJwk();
  const { signature, iat } = signRequest(jwk, { method: "POST", pathname: "/api/agent/posts", body: "{\"title\":\"a\"}" });
  expect(verifySignature(jwk.x, signature, "POST", "/api/agent/posts", "{\"title\":\"b\"}", String(iat))).toBe(false);
});

test("signature from a different key fails verification", () => {
  const jwk = makeJwk();
  const other = makeJwk();
  const { signature, iat } = signRequest(jwk, { method: "GET", pathname: "/api/agent/me", body: "" });
  expect(verifySignature(other.x, signature, "GET", "/api/agent/me", "", String(iat))).toBe(false);
});

test("canonical string is stable and includes method/path/body-hash/iat", () => {
  const s = canonicalString("post", "/api/agent/posts", "abc", "123");
  expect(s).toBe("AGENT-SIG v1\nPOST\n/api/agent/posts\nba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\n123");
});

test("signRequest rejects non-string bodies (must sign serialized bytes)", () => {
  const jwk = makeJwk();
  expect(() => signRequest(jwk, { method: "POST", pathname: "/api/agent/posts", body: { title: "x" } as never })).toThrow();
});

test("timestamp window accepts recent, rejects stale", () => {
  expect(timestampInWindow(String(Date.now()))).toBe(true);
  expect(timestampInWindow(String(Date.now() - 5_000))).toBe(true);
  expect(timestampInWindow(String(Date.now() - 120_000))).toBe(false);
  expect(timestampInWindow(String(Date.now() + 120_000))).toBe(false);
  expect(timestampInWindow("not-a-number")).toBe(false);
  expect(timestampInWindow(null)).toBe(false);
});
