export const FIRST_SENTENCE_MAX = 200;

/**
 * Extract a list-preview snippet from raw markdown body text: the first
 * sentence with formatting stripped, capped at FIRST_SENTENCE_MAX chars.
 * Used as a mechanical fallback when no manual or AI-generated excerpt exists.
 */
export function firstSentence(markdown: string, max = FIRST_SENTENCE_MAX): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/^[\s-]*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const sentence = (text.split(/(?<=[。！？.!?…])\s*/)[0] ?? text).trim();
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
