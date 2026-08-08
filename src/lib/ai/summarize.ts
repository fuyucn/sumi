import { extractHeadings } from "@/lib/heading-slug";
import { parseSummaryPoint } from "@/lib/ai/summary-point";
import type { AiProviderConfig, AiSummaryPoint, AiSummaryResult } from "@/content/ai-store";

/** Generation must finish inside this window or the server action returns a timeout hint. */
const GENERATION_TIMEOUT_MS = 90_000;
/** Connectivity probe stays snappy so the settings form never hangs. */
const TEST_TIMEOUT_MS = 15_000;

/**
 * OpenAI-compatible chat completions call (plain fetch, no SDK). Any provider
 * that speaks the `/chat/completions` shape works: OpenAI, DeepSeek, Moonshot,
 * Ollama (OpenAI mode), LM Studio, SiliconFlow, etc.
 */
export async function chatCompletion(
  provider: Pick<AiProviderConfig, "baseUrl" | "apiKey" | "model">,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 2048,
  timeoutMs = GENERATION_TIMEOUT_MS,
): Promise<string> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("LLM 请求超时")), timeoutMs);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  clearTimeout(timer);
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`LLM ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned an empty completion");
  return content;
}

/** Pull a JSON object out of an LLM reply (handles code fences + prose). */
export function parseSummaryResponse(raw: string): AiSummaryResult {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LLM reply contained no JSON");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<AiSummaryResult>;
  if (typeof parsed.tldr !== "string" || !parsed.tldr.trim()) throw new Error("LLM reply missing tldr");
  const points = Array.isArray(parsed.points)
    ? parsed.points.map(parseSummaryPoint).filter((p): p is AiSummaryPoint => p !== null)
    : [];
  if (!points.length) throw new Error("LLM reply missing points");
  const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : undefined;
  return { summary, tldr: parsed.tldr.trim(), points };
}

export function summaryPrompt(body: string): Array<{ role: "system" | "user"; content: string }> {
  const headings = extractHeadings(body);
  const anchorList =
    headings.length > 0
      ? headings.map((h) => `- ${h.slug} → ${h.text}`).join("\n")
      : "（这篇文章没有小标题，所有 anchor 一律填 null）";
  return [
    {
      role: "system",
      content:
        `你是一位资深中文编辑。阅读全文后，输出「AI 总结」帮助读者快速决定是否细读：一段连贯的总结段落（summary）、一句话 TL;DR 和 3-5 条要点（points）。` +
        `summary 用 100-180 字把文章核心观点、结构与结论完整复述一遍，可独立阅读；tldr 是一句话概括，60 字以内；` +
        `每条要点尽量对应文章的一个小标题章节，方便读者点击跳转。只输出 JSON，不要任何解释：` +
        `{"summary":"一段式完整总结，100-180 字","tldr":"一句话总结，60 字以内","points":[{"text":"要点内容","anchor":"章节锚点 slug 或 null"}]}。` +
        `要求：anchor 必须从下面的「可用锚点」列表中挑选；没有对应章节时填 null。` +
        `可用锚点（slug → 标题）：\n${anchorList}`,
    },
    { role: "user", content: `请为下面这篇文章生成 AI 总结：\n\n${body.slice(0, 12_000)}` },
  ];
}

export async function generateSummary(provider: AiProviderConfig, body: string): Promise<AiSummaryResult> {
  const raw = await chatCompletion(provider, summaryPrompt(body));
  return parseSummaryResponse(raw);
}

/** Minimal connectivity check for the settings form. */
export async function testProvider(provider: AiProviderConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await chatCompletion(
      provider,
      [{ role: "user", content: "回复 OK" }],
      512,
      TEST_TIMEOUT_MS,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
