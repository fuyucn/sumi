import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Markdown, resolveUrl } from "./markdown";

test("renders markdown headings and bold to HTML", () => {
  const html = renderToStaticMarkup(<Markdown>{"# Title\n\nsome **bold** text"}</Markdown>);
  expect(html).toContain('<h1 id="title" class="scroll-mt-24">Title</h1>');
  expect(html).toContain("<strong>bold</strong>");
});

test("renders CJK headings with stable anchor ids", () => {
  const html = renderToStaticMarkup(<Markdown>{"## 安装 与 启动\n\n正文"}</Markdown>);
  expect(html).toContain('<h2 id="安装-与-启动" class="scroll-mt-24">');
});

test("renders GFM tables", () => {
  const html = renderToStaticMarkup(<Markdown>{"| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>);
  expect(html).toContain("<table>");
});

test("does not render raw HTML (XSS safety)", () => {
  const html = renderToStaticMarkup(<Markdown>{"<script>alert(1)</script>"}</Markdown>);
  expect(html).not.toContain("<script>");
});

test("resolveUrl: relative path is prefixed with base", () => {
  expect(resolveUrl("https://raw.githubusercontent.com/owner/repo/main/content/@alice/my-post/", "images/photo.png")).toBe(
    "https://raw.githubusercontent.com/owner/repo/main/content/@alice/my-post/images/photo.png",
  );
});

test("resolveUrl: absolute URL is left unchanged", () => {
  const abs = "https://example.com/img.png";
  expect(resolveUrl("https://some.base/path/", abs)).toBe(abs);
});

test("resolveUrl: no base leaves URL unchanged", () => {
  expect(resolveUrl(undefined, "images/foo.png")).toBe("images/foo.png");
});

test("resolveUrl: root-relative path is left unchanged", () => {
  expect(resolveUrl("https://some.base/path/", "/static/img.png")).toBe("/static/img.png");
});

test("Markdown with baseUrl resolves relative image src", () => {
  const base = "https://raw.githubusercontent.com/owner/repo/main/content/@alice/post/";
  const html = renderToStaticMarkup(<Markdown baseUrl={base}>{"![alt](images/photo.png)"}</Markdown>);
  expect(html).toContain(`src="${base}images/photo.png"`);
});

test("Markdown without baseUrl leaves image src unchanged", () => {
  const html = renderToStaticMarkup(<Markdown>{"![alt](images/photo.png)"}</Markdown>);
  expect(html).toContain('src="images/photo.png"');
});
