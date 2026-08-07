const CJK =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;

/** Rough word + reading-time estimate for a Markdown body.
 *  CJK characters count as one "word" each; Latin text splits on spaces.
 *  Code fences, inline code, images, and link URLs are ignored. */
export function estimateReadingTime(markdown: string): {
  words: number;
  minutes: number;
} {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|+\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cjk = text.match(CJK)?.length ?? 0;
  const latin = text
    .replace(CJK, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const words = cjk + latin;
  // 250 is a middle ground between Latin prose (~200 wpm) and CJK (~350 cpm).
  return { words, minutes: Math.max(1, Math.round(words / 250)) };
}
