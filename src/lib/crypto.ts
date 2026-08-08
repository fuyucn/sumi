import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM at-rest encryption for small secrets (AI provider API keys).
//
// The cipher key is derived from the app master secret (BETTER_AUTH_SECRET),
// which lives only in env — never in the database. A DB leak therefore does
// not leak third-party API keys; rotating BETTER_AUTH_SECRET requires saving
// the provider config again (old ciphertexts fail to decrypt and are treated
// as unset).

const PREFIX = "enc:v1:";
const IV_LEN = 12;

function deriveKey(masterSecret: string): Buffer {
  return createHash("sha256").update(`sumi:secrets:v1:${masterSecret}`).digest();
}

/** Encrypt a plaintext secret. Output format: `enc:v1:<iv>:<tag>:<cipher>`. */
export function encryptSecret(plain: string, masterSecret: string): string {
  const key = deriveKey(masterSecret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a value produced by `encryptSecret`. Returns null for values that
 * are not `enc:v1:` payloads (legacy plaintext rows) or that fail to decrypt
 * (rotated master secret / corrupted row).
 */
export function decryptSecret(payload: string, masterSecret: string): string | null {
  if (!payload.startsWith(PREFIX)) return null;
  const body = payload.slice(PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) return null;
  const [ivB64, tagB64, dataB64] = parts;
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const key = deriveKey(masterSecret);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/** True when the stored value is an encrypted payload (not legacy plaintext). */
export function isEncryptedSecret(payload: string): boolean {
  return payload.startsWith(PREFIX);
}
