export interface HeadingInfo {
  text: string;
  slug: string;
}

/**
 * Slugify a markdown heading into a stable URL fragment id. Keeps CJK and
 * other unicode letters, drops punctuation, collapses whitespace runs to a
 * single hyphen. Must stay in sync with the anchors listed in the AI 总结
 * prompt (src/lib/ai/summarize.ts) so generated anchors match real ids.
 */
export function headingSlug(text: string): string {
  return text
    .trim()
    .replace(/[`*_~[\]()]/g, "")
    .toLowerCase()
    .replace(/[\s/\\#]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_RE = /^(`{3,}|~{3,})/;

/** Strip markdown links/images from a heading line so the slug matches the
 * rendered id (react-markdown flattens those to their text/alt content). */
function stripInlineMd(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

/** Extract markdown ATX headings (text + anchor slug) from a post body. */
export function extractHeadings(markdown: string): HeadingInfo[] {
  const out: HeadingInfo[] = [];
  let inFence = false;
  let fenceChar = "";
  for (const line of markdown.split("\n")) {
    const fence = line.match(FENCE_RE);
    if (fence) {
      const char = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = char;
      } else if (char === fenceChar && !line.slice(fence[1].length).trim()) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const match = line.match(HEADING_RE);
    if (!match) continue;
    const text = stripInlineMd(match[2]).trim();
    if (!text) continue;
    out.push({ text, slug: headingSlug(text) });
  }
  return out;
}
