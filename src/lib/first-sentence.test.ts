import { describe, expect, test } from "vitest";
import { firstSentence } from "./first-sentence";

describe("firstSentence", () => {
  test("takes the first sentence of plain text", () => {
    expect(firstSentence("Hello world. This is the second sentence.")).toBe("Hello world.");
  });

  test("splits on Chinese punctuation", () => {
    expect(firstSentence("这是一句导读。后面还有更多内容。")).toBe("这是一句导读。");
  });

  test("strips markdown formatting and links", () => {
    const md = "# Title\n\n这是**加粗**的一行，带有[链接](https://example.com)。继续…";
    expect(firstSentence(md)).toBe("这是加粗的一行，带有链接。");
  });

  test("drops code fences and images", () => {
    const md = "```ts\nconst x = 1;\n```\n\n![pic](/img.png) 正文开始。";
    expect(firstSentence(md)).toBe("正文开始。");
  });

  test("caps the length and appends an ellipsis", () => {
    const long = "长".repeat(250);
    const out = firstSentence(long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(201);
  });

  test("returns an empty string for empty or image-only bodies", () => {
    expect(firstSentence("")).toBe("");
    expect(firstSentence("![pic](/img.png)")).toBe("");
  });
});
