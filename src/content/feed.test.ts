import { expect, test } from "vitest";
import type { ContentStore } from "./store";
import { feedFromStore } from "./feed";
import type { PostMeta } from "./types";

function fakeStore(data: Record<string, PostMeta[]>): ContentStore {
  return {
    async listHandles() { return Object.keys(data); },
    async listPosts({ handle, status } = {}) {
      const posts = handle ? (data[handle] ?? []) : Object.values(data).flat();
      return status ? posts.filter((p) => p.status === status) : posts;
    },
    async getPost() { return null; },
    async savePost() { return ""; },
    async deletePost() {},
    async uploadImage() { return ""; },
  };
}

test("feedFromStore returns published posts across creators, newest first", async () => {
  const mk = (slug: string, publishedAt: string, status: "draft" | "published"): PostMeta =>
    ({ title: slug, slug, tags: [], status, publishedAt });
  const store = fakeStore({
    alice: [mk("a1", "2026-06-10T00:00:00Z", "published"), mk("draft1", "2026-06-12T00:00:00Z", "draft")],
    bob: [mk("b1", "2026-06-11T00:00:00Z", "published")],
  });
  const feed = await feedFromStore(store);
  expect(feed.map((f) => `${f.handle}/${f.post.slug}`)).toEqual(["bob/b1", "alice/a1"]);
});

test("feedFromStore returns [] for a null store", async () => {
  expect(await feedFromStore(null)).toEqual([]);
});
