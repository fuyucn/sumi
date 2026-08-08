import { expect, test } from "vitest";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./crypto";

const SECRET = "s".repeat(32);

test("encrypt/decrypt round-trips the plaintext", () => {
  const cipher = encryptSecret("sk-openai-123", SECRET);
  expect(cipher.startsWith("enc:v1:")).toBe(true);
  expect(isEncryptedSecret(cipher)).toBe(true);
  expect(cipher).not.toContain("sk-openai-123");
  expect(decryptSecret(cipher, SECRET)).toBe("sk-openai-123");
});

test("same plaintext produces distinct ciphertexts (random IV)", () => {
  const a = encryptSecret("sk-x", SECRET);
  const b = encryptSecret("sk-x", SECRET);
  expect(a).not.toBe(b);
  expect(decryptSecret(a, SECRET)).toBe(decryptSecret(b, SECRET));
});

test("wrong master secret fails to decrypt", () => {
  const cipher = encryptSecret("sk-x", SECRET);
  expect(decryptSecret(cipher, "x".repeat(32))).toBeNull();
});

test("tampered ciphertext fails to decrypt", () => {
  const cipher = encryptSecret("sk-x", SECRET);
  const tampered = cipher.slice(0, -2) + (cipher.endsWith("==") ? "AA" : "zZ");
  expect(decryptSecret(tampered, SECRET)).toBeNull();
});

test("legacy plaintext values pass through untouched", () => {
  expect(isEncryptedSecret("sk-plain")).toBe(false);
  expect(decryptSecret("sk-plain", SECRET)).toBeNull();
});

test("malformed payloads are rejected", () => {
  expect(decryptSecret("enc:v1:only-two-parts", SECRET)).toBeNull();
  expect(decryptSecret("enc:v1:a:b:c:d", SECRET)).toBeNull();
});
