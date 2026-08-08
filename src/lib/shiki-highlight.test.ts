import { expect, test } from "vitest";
import { highlightCode } from "./shiki-highlight";

test("highlights fenced code blocks with Shiki", async () => {
  const html = await highlightCode("const n: number = 1", "ts");
  expect(html).toContain('class="shiki');
  expect(html).toContain("--shiki-dark");
  expect(html).toContain("const");
});

test("falls back to plain text for unknown languages", async () => {
  const html = await highlightCode("just some words", "mermaid");
  expect(html).toContain('class="shiki');
  expect(html).toContain("just some words");
});
