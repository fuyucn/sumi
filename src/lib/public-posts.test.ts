import { expect, test } from "vitest";
import { buildFeedXml, collectSitemapUrls, escapeXml, type PublicPostRef } from "./public-posts";

const posts: PublicPostRef[] = [
  { handle: "bob", slug: "second", title: "Second", publishedAt: "2026-08-02T00:00:00.000Z", tags: ["web"] },
  {
    handle: "alice",
    slug: "hello",
    title: "Hello <World> & friends",
    excerpt: "A <post> & more",
    publishedAt: "2026-08-01T10:00:00.000Z",
    tags: ["web", "intro"],
  },
];

test("escapeXml escapes the five XML entities", () => {
  expect(escapeXml(`<a href="x" y='z'> & <`)).toBe("&lt;a href=&quot;x&quot; y=&apos;z&apos;&gt; &amp; &lt;");
});

test("buildFeedXml emits well-formed RSS with permalinks, pubDate and escaped titles", () => {
  const xml = buildFeedXml(posts, "https://example.com/");
  expect(xml).toContain('<rss version="2.0"');
  expect(xml).toContain("https://example.com/feed.xml");
  expect(xml).toContain("<link>https://example.com/@alice/hello</link>");
  expect(xml).toContain("<guid isPermaLink=\"true\">https://example.com/@alice/hello</guid>");
  expect(xml).toContain("<pubDate>Sat, 01 Aug 2026 10:00:00 GMT</pubDate>");
  expect(xml).toContain("<title>Hello &lt;World&gt; &amp; friends</title>");
  expect(xml).toContain("<description>A &lt;post&gt; &amp; more</description>");
  // newest first
  expect(xml.indexOf("@bob/second")).toBeLessThan(xml.indexOf("@alice/hello"));
});

test("collectSitemapUrls lists home, creators, posts and tags without duplicates", () => {
  const urls = collectSitemapUrls(posts, "https://example.com");
  expect(urls).toContain("https://example.com/");
  expect(urls).toContain("https://example.com/@alice");
  expect(urls).toContain("https://example.com/@bob");
  expect(urls).toContain("https://example.com/@alice/hello");
  expect(urls).toContain("https://example.com/@bob/second");
  expect(urls).toContain("https://example.com/tag/web");
  expect(urls).toContain("https://example.com/tag/intro");
  // dedup
  expect(new Set(urls).size).toBe(urls.length);
});

test("buildFeedXml with no posts is still valid RSS", () => {
  const xml = buildFeedXml([], "https://example.com");
  expect(xml).toContain("<channel>");
  expect(xml).toContain("</channel>");
});