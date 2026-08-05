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

// ---- Comments ----
import { parseComment, serializeComment, parseMagazine, serializeMagazine, parseProfile, serializeProfile } from "./frontmatter";

test("comment round-trips", () => {
  const md = serializeComment({ handle: "bob", date: "2026-06-13T01:02:03.000Z", body: "nice one!" });
  const parsed = parseComment(md, "x", "fallback");
  expect(parsed.id).toBe("x");
  expect(parsed.handle).toBe("bob");
  expect(parsed.date).toBe("2026-06-13T01:02:03.000Z");
  expect(parsed.body.trim()).toBe("nice one!");
  expect(parsed.parentId).toBeUndefined();
});

test("comment with a parent round-trips", () => {
  const md = serializeComment({ handle: "bob", date: "2026-06-13T01:02:03.000Z", body: "agree!", parentId: "parent-1" });
  const parsed = parseComment(md, "child-1", "fallback");
  expect(parsed.id).toBe("child-1");
  expect(parsed.parentId).toBe("parent-1");
  expect(parsed.body.trim()).toBe("agree!");
});

test("comment parse falls back on missing frontmatter", () => {
  const parsed = parseComment("plain body", "alice", "2026-01-01T00:00:00.000Z");
  expect(parsed.id).toBe("alice");
  expect(parsed.handle).toBe("alice");
  expect(parsed.date).toBe("2026-01-01T00:00:00.000Z");
  expect(parsed.parentId).toBeUndefined();
});

// ---- Magazines ----
test("magazine round-trips", () => {
  const md = serializeMagazine({ title: "My Zine", description: "a collection", items: ["one", "two"] });
  const parsed = parseMagazine(md, "my-zine");
  expect(parsed.title).toBe("My Zine");
  expect(parsed.description).toBe("a collection");
  expect(parsed.items).toEqual(["one", "two"]);
});

test("magazine parse defaults", () => {
  const parsed = parseMagazine("---\ntitle: Bare\n---\n", "bare");
  expect(parsed.title).toBe("Bare");
  expect(parsed.items).toEqual([]);
  expect(parsed.description).toBeUndefined();
});

// ---- Profile ----
test("profile round-trips and omits empty fields", () => {
  const md = serializeProfile({ displayName: "Alice", bio: "hello" });
  const parsed = parseProfile(md);
  expect(parsed).toEqual({ displayName: "Alice", bio: "hello" });
  const empty = serializeProfile({});
  expect(empty.trim()).toBe("");
  expect(parseProfile(empty)).toEqual({});
});
