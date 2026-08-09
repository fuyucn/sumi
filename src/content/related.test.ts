import { describe, expect, it } from "vitest";
import { pickRelated } from "./related";
import type { PostMeta } from "./types";

function post(partial: Partial<PostMeta> & { slug: string; title: string }): PostMeta {
  return {
    status: "published",
    tags: [],
    excerpt: "",
    publishedAt: "2026-08-01T00:00:00.000Z",
    ...partial,
  };
}

const feed = [
  { handle: "a", post: post({ slug: "current", title: "Current", tags: ["ts", "web"] }) },
  { handle: "a", post: post({ slug: "twin", title: "Twin", tags: ["ts", "web", "db"] }) },
  { handle: "b", post: post({ slug: "one-tag", title: "One tag", tags: ["web"] }) },
  { handle: "b", post: post({ slug: "unrelated", title: "Unrelated", tags: ["cooking"] }) },
  {
    handle: "c",
    post: post({
      slug: "older",
      title: "Older twin",
      tags: ["ts"],
      publishedAt: "2026-07-01T00:00:00.000Z",
    }),
  },
];

describe("pickRelated", () => {
  it("ranks by shared tags and never includes the current post", () => {
    const { items, byTag } = pickRelated(feed, "a", "current", ["ts", "web"]);
    expect(byTag).toBe(true);
    expect(items.map((i) => i.post.slug)).toEqual(["twin", "one-tag", "older"]);
    expect(items.some((i) => i.post.slug === "current")).toBe(false);
  });

  it("breaks shared-tag ties by published date, newest first", () => {
    const { items } = pickRelated(feed, "a", "current", ["ts", "web"]);
    // "twin" (2 shared) leads; "one-tag" and "older" (1 shared) sort by date.
    expect(items[0].post.slug).toBe("twin");
    expect(items[1].post.slug).toBe("one-tag");
    expect(items[2].post.slug).toBe("older");
  });

  it("falls back to latest posts when fewer than two share a tag", () => {
    const { items, byTag } = pickRelated(feed, "a", "current", ["cooking"]);
    expect(byTag).toBe(false);
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.post.slug)).not.toContain("current");
  });

  it("returns an empty pick for an empty feed", () => {
    expect(pickRelated([], "a", "current", [])).toEqual({
      items: [],
      byTag: false,
    });
  });

  it("keeps at most three items", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      handle: "a",
      post: post({
        slug: `p${i}`,
        title: `Post ${i}`,
        tags: ["shared"],
        publishedAt: `2026-08-0${(i % 9) + 1}T00:00:00.000Z`,
      }),
    }));
    const { items, byTag } = pickRelated(many, "a", "current", ["shared"]);
    expect(byTag).toBe(true);
    expect(items).toHaveLength(3);
  });
});
