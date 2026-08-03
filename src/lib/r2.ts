/**
 * Thin helpers for Cloudflare R2 image storage. The bucket is typed
 * structurally so callers can pass a real R2 binding or a test stub.
 */

/** Minimal structural type for a Cloudflare R2 bucket. */
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array | string | null): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

export interface R2ObjectBodyLike {
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Default URL prefix for public image routes (e.g. a custom domain or worker route). */
export const DEFAULT_IMAGE_BASE = "/images";

/**
 * Build a stable public URL for an R2 object key. Strips any leading slash so the
 * key joins cleanly onto the base.
 */
export function buildImageUrl(key: string, base: string = DEFAULT_IMAGE_BASE): string {
  const clean = key.replace(/^\/+/, "");
  return `${base.replace(/\/+$/, "")}/${clean}`;
}

/** Wrap an R2 bucket with put/get/delete and a URL builder. */
export class R2Store {
  constructor(private readonly bucket: R2BucketLike) {}

  async put(key: string, bytes: Uint8Array): Promise<string> {
    await this.bucket.put(key, bytes);
    return buildImageUrl(key);
  }

  async get(key: string): Promise<Uint8Array | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    const buf = await obj.arrayBuffer();
    return new Uint8Array(buf);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
