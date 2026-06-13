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
