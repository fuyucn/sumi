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
    async listComments() { return []; },
    async addComment() { return { id: "", body: "", handle: "", date: "" }; },
    async deleteComment() {},
    async listLikes() { return []; },
    async addLike() {},
    async removeLike() {},
    async listFollowers() { return []; },
    async listFollowing() { return []; },
    async addFollow() {},
    async removeFollow() {},
    async getProfile() { return null; },
    async saveProfile() {},
    async listNotes() { return []; },
    async addNote() { return { id: "", handle: "", body: "", date: "" }; },
    async deleteNote() {},
    async listFriends() { return []; },
    async addFriend() { return { id: "", name: "", url: "", createdAt: "" }; },
    async deleteFriend() {},
    async listMagazines() { return []; },
    async getMagazine() { return null; },
    async saveMagazine() { return ""; },
    async deleteMagazine() {},
    async listProjects() { return []; },
    async getProject() { return null; },
    async saveProject() { return ""; },
    async deleteProject() {},
    async listPages() { return []; },
    async getPage() { return null; },
    async savePage() { return ""; },
    async deletePage() {},
    async listNotifications() { return []; },
    async addNotification(_h, n, now) { return { id: "ntf", handle: "alice", date: now.toISOString(), read: false, ...n }; },
    async markNotificationsRead() { return 0; },
    async listTags() { return []; },
    async searchPosts() { return []; },
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
