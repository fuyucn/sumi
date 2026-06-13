import { expect, test } from "vitest";
import { parsePost, serializePost } from "./frontmatter";
import type { Post } from "./types";

const post: Post = {
  title: "Hello",
  slug: "hello",
  tags: ["intro", "note"],
  excerpt: "hi there",
  status: "published",
  publishedAt: "2026-06-12T00:00:00.000Z",
  body: "# Hello\n\nThis is **markdown**.\n",
};

test("serialize then parse round-trips a post", () => {
  const md = serializePost(post);
  expect(md).toContain("---");
  expect(md).toContain("title: Hello");
  expect(md).toContain("# Hello");
  const parsed = parsePost(md, "hello");
  expect(parsed).toEqual(post);
});

test("parse fills defaults for missing optional frontmatter", () => {
  const md = "---\ntitle: Bare\nstatus: draft\n---\nbody text\n";
  const parsed = parsePost(md, "bare");
  expect(parsed.title).toBe("Bare");
  expect(parsed.slug).toBe("bare");
  expect(parsed.tags).toEqual([]);
  expect(parsed.status).toBe("draft");
  expect(parsed.body.trim()).toBe("body text");
});
