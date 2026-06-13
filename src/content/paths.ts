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
