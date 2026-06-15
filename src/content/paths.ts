export const CONTENT_DIR = "content";

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "post";
}

export function userDir(handle: string): string {
  return `${CONTENT_DIR}/@${handle}`;
}
export function postDir(handle: string, slug: string): string {
  return `${userDir(handle)}/${slug}`;
}
export function postFile(handle: string, slug: string): string {
  return `${postDir(handle, slug)}/index.md`;
}
export function imagePath(handle: string, slug: string, filename: string): string {
  return `${postDir(handle, slug)}/images/${filename}`;
}

/**
 * Sanitize an uploaded image filename: lowercase, slugified base name,
 * preserved extension. Falls back to "image" if the base name is empty.
 * Examples: "My Photo.PNG" → "my-photo.png", ".png" → "image.png"
 */
export function safeImageName(original: string): string {
  // Separate base name from extension. We recognize an extension at any dot
  // position (including leading dots like ".png" → base="", ext=".png").
  const lastDot = original.lastIndexOf(".");
  const hasExt = lastDot >= 0;
  const rawBase = hasExt ? original.slice(0, lastDot) : original;
  const rawExt = hasExt ? original.slice(lastDot).toLowerCase() : "";
  // slugify falls back to "post" for empty/symbol-only input; we want "image"
  // for image filenames, so slugify the raw base and replace the generic fallback.
  const slugged = rawBase.replace(/[^\p{L}\p{N}]+/gu, "").trim() ? slugify(rawBase) : "";
  const base = slugged || "image";
  return `${base}${rawExt}`;
}
