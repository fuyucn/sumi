import type { AiSummaryPoint } from "@/content/ai-store";

/**
 * Normalize one entry of a summary `points` array. Accepts the legacy string
 * form ("要点") and the current object form ({"text":"要点","anchor":"slug"}).
 * Returns null for anything unusable.
 */
export function parseSummaryPoint(value: unknown): AiSummaryPoint | null {
  if (typeof value === "string") return value.trim() ? { text: value.trim() } : null;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string" && obj.text.trim()) {
      const point: AiSummaryPoint = { text: obj.text.trim() };
      if (typeof obj.anchor === "string" && obj.anchor.trim()) {
        point.anchor = obj.anchor.trim();
      }
      return point;
    }
  }
  return null;
}
