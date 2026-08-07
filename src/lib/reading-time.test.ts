import { describe, expect, it } from "vitest";
import { estimateReadingTime } from "./reading-time";

describe("estimateReadingTime", () => {
  it("counts Latin words", () => {
    const r = estimateReadingTime("one two three four five");
    expect(r.words).toBe(5);
    expect(r.minutes).toBeGreaterThanOrEqual(1);
  });

  it("counts CJK characters as words", () => {
    const r = estimateReadingTime("墨与纸的安静角落");
    expect(r.words).toBe(8);
  });

  it("mixes CJK and Latin", () => {
    const r = estimateReadingTime("写一篇文章 about the quiet place");
    expect(r.words).toBe(9);
  });

  it("ignores code fences, inline code, images, and link URLs", () => {
    const body = [
      "```ts",
      "const a = 1;",
      "```",
      "`inline`",
      "![alt](https://example.com/pic.png)",
      "[a link](https://example.com)",
      "hello world",
    ].join("\n");
    const r = estimateReadingTime(body);
    expect(r.words).toBe(4);
  });

  it("never reports zero minutes for empty-ish input", () => {
    expect(estimateReadingTime("").minutes).toBe(1);
    expect(estimateReadingTime("   ").minutes).toBe(1);
  });
});
