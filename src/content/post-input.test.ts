import { expect, test } from "vitest";
import { buildNewPost } from "./post-input";

const now = new Date("2026-06-13T12:00:00.000Z");

test("draft: status draft, no publishedAt, tags parsed", () => {
  const p = buildNewPost({ title: "Hi", body: "x", tags: "a, b ,c", publish: false }, now);
  expect(p.status).toBe("draft");
  expect(p.publishedAt).toBeUndefined();
  expect(p.tags).toEqual(["a", "b", "c"]);
  expect(p.title).toBe("Hi");
  expect(p.body).toBe("x");
});

test("publish: status published, publishedAt = now ISO", () => {
  const p = buildNewPost({ title: "Hi", body: "x", tags: "", publish: true }, now);
  expect(p.status).toBe("published");
  expect(p.publishedAt).toBe("2026-06-13T12:00:00.000Z");
  expect(p.tags).toEqual([]);
});

test("empty title throws", () => {
  expect(() => buildNewPost({ title: "  ", body: "x", tags: "", publish: false }, now)).toThrow();
});

test("missing fields use defaults (tags '', publish false)", () => {
  const p = buildNewPost({ title: "T", body: "" }, now);
  expect(p.status).toBe("draft");
  expect(p.tags).toEqual([]);
});

test("publish preserves an existing publishedAt (no re-stamp)", () => {
  const p = buildNewPost({ title: "Hi", body: "x", publish: true, publishedAt: "2026-01-01T00:00:00.000Z" }, now);
  expect(p.publishedAt).toBe("2026-01-01T00:00:00.000Z");
});

test("save-as-draft preserves an existing publishedAt", () => {
  const p = buildNewPost({ title: "Hi", body: "x", publish: false, publishedAt: "2026-01-01T00:00:00.000Z" }, now);
  expect(p.status).toBe("draft");
  expect(p.publishedAt).toBe("2026-01-01T00:00:00.000Z");
});

test("excerpt is trimmed and omitted when blank", () => {
  const withExcerpt = buildNewPost({ title: "Hi", body: "x", excerpt: "  一句导读  ", publish: false }, now);
  expect(withExcerpt.excerpt).toBe("一句导读");
  const blank = buildNewPost({ title: "Hi", body: "x", excerpt: "   ", publish: false }, now);
  expect(blank.excerpt).toBeUndefined();
});

test("excerpt longer than 300 chars is rejected by validation", () => {
  expect(() =>
    buildNewPost({ title: "Hi", body: "x", excerpt: "长".repeat(301), publish: false }, now),
  ).toThrow();
});
