import { describe, expect, it } from "vitest";
import { friendlyAiError, friendlyAiErrorShort } from "./error-hint";

describe("friendlyAiErrorShort", () => {
  it("maps a raw 401 JSON blob to a readable one-liner", () => {
    const raw = `LLM 401: {"type":"error","error":{"type":"AuthError","message":"Invalid API key."}}`;
    expect(friendlyAiErrorShort(raw)).toBe("API Key 无效或已过期，请到 Settings → AI 总结 更新");
  });

  it("truncates long non-key errors for notification bodies", () => {
    expect(friendlyAiErrorShort("x".repeat(300))).toHaveLength(120);
  });

  it("keeps friendlyAiError's debugging detail", () => {
    const raw = '401 {"error":{"message":"Invalid API key."}}';
    expect(friendlyAiError(raw)).toContain("原始错误：");
  });
});
