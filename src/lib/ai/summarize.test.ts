import { describe, expect, test } from "vitest";
import { parseSummaryResponse, summaryPrompt } from "./summarize";

describe("parseSummaryResponse", () => {
  const json = `{"tldr":"一句话总结","points":[{"text":"要点一","anchor":"安装"},{"text":"要点二"}]}`;

  test("parses plain JSON with anchored points", () => {
    expect(parseSummaryResponse(json)).toEqual({
      tldr: "一句话总结",
      points: [
        { text: "要点一", anchor: "安装" },
        { text: "要点二" },
      ],
    });
  });

  test("parses JSON inside a code fence", () => {
    expect(parseSummaryResponse(`\`\`\`json\n${json}\n\`\`\``)).toEqual({
      tldr: "一句话总结",
      points: [
        { text: "要点一", anchor: "安装" },
        { text: "要点二" },
      ],
    });
  });

  test("parses JSON embedded in prose", () => {
    const withProse = `好的，这是 AI 总结：\n${json}\n以上内容仅供参考。`;
    expect(parseSummaryResponse(withProse)).toEqual({
      tldr: "一句话总结",
      points: [
        { text: "要点一", anchor: "安装" },
        { text: "要点二" },
      ],
    });
  });

  test("normalizes legacy string points to object form", () => {
    const result = parseSummaryResponse(`{"tldr":"总结","points":["要点一","要点二"]}`);
    expect(result.points).toEqual([{ text: "要点一" }, { text: "要点二" }]);
    expect(result.summary).toBeUndefined();
  });

  test("parses optional summary paragraph and trims it", () => {
    const result = parseSummaryResponse(
      `{"summary":"  一段完整的文章总结，覆盖结构、观点与结论。  ","tldr":"一句话","points":[{"text":"要点","anchor":null}]}`,
    );
    expect(result.summary).toBe("一段完整的文章总结，覆盖结构、观点与结论。");
    expect(result.tldr).toBe("一句话");
  });

  test("rejects missing tldr", () => {
    expect(() => parseSummaryResponse(`{"points":["要点一"]}`)).toThrow(/missing tldr/);
  });

  test("rejects empty points", () => {
    expect(() => parseSummaryResponse(`{"tldr":"总结","points":[]}`)).toThrow(/missing points/);
  });

  test("filters unusable points and keeps anchors", () => {
    const result = parseSummaryResponse(
      `{"tldr":"总结","points":["a", 42, null, {"text":"b","anchor":"部署"}, {"anchor":"x"}]}`,
    );
    expect(result.points).toEqual([{ text: "a" }, { text: "b", anchor: "部署" }]);
  });

  test("rejects non-JSON reply", () => {
    expect(() => parseSummaryResponse("抱歉，我无法生成 AI 总结")).toThrow();
  });
});

describe("summaryPrompt", () => {
  test("asks for summary + tldr + anchored points and includes the body", () => {
    const messages = summaryPrompt("# 安装\n\n这是正文内容");
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("summary");
    expect(messages[0].content).toContain("TL;DR");
    expect(messages[0].content).toContain("anchor");
    expect(messages[0].content).toContain("安装 → 安装");
    expect(messages[1].content).toContain("这是正文内容");
  });

  test("tells the model to use null anchors when the article has no headings", () => {
    const messages = summaryPrompt("纯正文，没有小标题");
    expect(messages[0].content).toContain("所有 anchor 一律填 null");
  });

  test("truncates long bodies to 12k chars", () => {
    const messages = summaryPrompt("x".repeat(20_000));
    expect(messages[1].content!.length).toBeLessThan(12_500);
  });
});
