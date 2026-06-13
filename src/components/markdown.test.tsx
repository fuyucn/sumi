import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Markdown } from "./markdown";

test("renders markdown headings and bold to HTML", () => {
  const html = renderToStaticMarkup(<Markdown>{"# Title\n\nsome **bold** text"}</Markdown>);
  expect(html).toContain("<h1>Title</h1>");
  expect(html).toContain("<strong>bold</strong>");
});

test("renders GFM tables", () => {
  const html = renderToStaticMarkup(<Markdown>{"| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>);
  expect(html).toContain("<table>");
});

test("does not render raw HTML (XSS safety)", () => {
  const html = renderToStaticMarkup(<Markdown>{"<script>alert(1)</script>"}</Markdown>);
  expect(html).not.toContain("<script>");
});
