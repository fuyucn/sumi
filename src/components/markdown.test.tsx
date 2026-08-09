import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Markdown, resolveUrl } from "./markdown";

/** Await async (Shiki) code blocks by rendering through the readable stream. */
async function renderMarkdown(md: string): Promise<string> {
  const stream = await renderToReadableStream(<Markdown>{md}</Markdown>);
  return await new Response(stream).text();
}

test("renders markdown headings and bold to HTML", () => {
  const html = renderToStaticMarkup(<Markdown>{"# Title\n\nsome **bold** text"}</Markdown>);
  expect(html).toContain('<h1 id="title" class="scroll-mt-24 group/heading">Title<a href="#title" aria-label="Link to Title" class="heading-anchor">#</a></h1>');
  expect(html).toContain("<strong>bold</strong>");
});

test("renders CJK headings with stable anchor ids", () => {
  const html = renderToStaticMarkup(<Markdown>{"## 安装 与 启动\n\n正文"}</Markdown>);
  expect(html).toContain('<h2 id="安装-与-启动" class="scroll-mt-24 group/heading">安装 与 启动<a href="#安装-与-启动" aria-label="Link to 安装 与 启动" class="heading-anchor">#</a></h2>');
  expect(html).toContain("正文");
});

test("renders GFM tables inside the framed scroll container", () => {
  const html = renderToStaticMarkup(<Markdown>{"| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>);
  expect(html).toContain("my-6 overflow-x-auto rounded-card border border-line");
  expect(html).toContain("<table>");
  expect(html).toContain("<th>a</th>");
  expect(html).toContain("<td>1</td>");
});

test("renders fenced code blocks with Shiki in a framed code well and a language label", async () => {
  const html = await renderMarkdown("```ts\nconst x: number = 1;\n```");
  expect(html).toContain("code-well");
  expect(html).toContain("class=\"shiki");
  expect(html).toContain(">ts</span>");
  expect(html).toContain("<span class=\"line\">");
  expect(html).toContain(">const</span>");
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

test("images are wrapped in a zoom trigger by default", () => {
  const html = renderToStaticMarkup(<Markdown>{"![alt](a.png)"}</Markdown>);
  expect(html).toContain('aria-label="放大图片：alt"');
});

test("zoomable=false renders a plain image without the lightbox trigger", () => {
  const html = renderToStaticMarkup(<Markdown zoomable={false}>{"![alt](a.png)"}</Markdown>);
  expect(html).toContain("<img");
  expect(html).not.toContain("放大图片");
});
