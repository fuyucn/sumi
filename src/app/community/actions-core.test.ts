import { expect, test, vi } from "vitest";
import type { ContentStore } from "@/content/store";
import type { Comment, NewNotification, Notification } from "@/content/types";
import { runAddComment, runAddFriend, runAddNote, runDeleteComment, runDeleteFriend, runDeleteMagazine, runDeleteNote, runDeletePage, runDeleteProject, runGetLikeState, runMarkNotificationsRead, runSaveMagazine, runSavePage, runSaveProfile, runSaveProject, runToggleFollow, runToggleLike } from "./actions-core";

function fakeStore(): ContentStore {
  return {
    async listHandles() { return []; },
    async listPosts() { return []; },
    async getPost() { return null; },
    async savePost() { return "x"; },
    async incrementViews() { return 0; },
    async deletePost() {},
    async uploadImage() { return ""; },
    async listComments() { return []; },
    async addComment(_p, _s, c, author, now) { return { id: "cid", ...c, handle: author, date: now.toISOString() }; },
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
    async addNote(_h, n, now) { return { id: "n1", handle: "alice", body: n.body, date: now.toISOString() }; },
    async deleteNote() {},
    async listFriends() { return []; },
    async addFriend(f, now) { return { id: "f1", ...f, createdAt: now.toISOString() }; },
    async deleteFriend() {},
    async listMagazines() { return []; },
    async getMagazine() { return null; },
    async saveMagazine(handle, m) { return m.title.toLowerCase().replace(/\s+/g, "-"); },
    async deleteMagazine() {},
    async listProjects() { return []; },
    async getProject() { return null; },
    saveProject: vi.fn(async () => "proj"),
    async deleteProject() {},
    async listPages() { return []; },
    async getPage() { return null; },
    async savePage() { return "pg"; },
    async deletePage() {},
    async listNotifications() { return []; },
    async addNotification(_h, n, now) { return { id: "ntf1", handle: "alice", date: now.toISOString(), read: false, ...n }; },
    async markNotificationsRead() { return 0; },
    async listTags() { return []; },
    async searchPosts() { return []; },
  };
}

const deps = { userId: "u1", handle: "alice", store: fakeStore() };

test("addComment is guarded when not signed in", async () => {
  const res = await runAddComment({ userId: null, handle: null, store: null }, { body: "hi" }, new Date());
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error).toContain("signed in");
});

test("addComment validates and stores", async () => {
  const res = await runAddComment(deps, { postHandle: "alice", slug: "hello", body: " nice " }, new Date("2026-01-01T00:00:00.000Z"));
  expect(res.ok).toBe(true);
  if (res.ok) {
    expect(res.data.handle).toBe("alice");
    expect(res.data.body).toBe("nice");
  }
});

test("addComment rejects empty body", async () => {
  const res = await runAddComment(deps, { postHandle: "alice", slug: "hello", body: "   " }, new Date());
  expect(res.ok).toBe(false);
});

test("profile requires sign-in and saves", async () => {
  const res = await runSaveProfile({ userId: null, handle: null, store: null }, { displayName: "X" });
  expect(res.ok).toBe(false);
  const ok = await runSaveProfile(deps, { displayName: "Alice", bio: "hi" });
  expect(ok.ok).toBe(true);
  if (ok.ok) expect(ok.data).toEqual({ displayName: "Alice", bio: "hi" });
});

test("magazine save + delete", async () => {
  const ok = await runSaveMagazine(deps, { title: "My Zine", description: "d", items: ["one"] });
  expect(ok.ok).toBe(true);
  if (ok.ok) expect(ok.data.slug).toBe("my-zine");
  const del = await runDeleteMagazine(deps, "my-zine");
  expect(del.ok).toBe(true);
  const guardDel = await runDeleteMagazine({ userId: null, handle: null, store: null }, "my-zine");
  expect(guardDel.ok).toBe(false);
});

test("project save validates URL, guards, and deletes", async () => {
  const guard = await runSaveProject({ userId: null, handle: null, store: null }, { title: "X" });
  expect(guard.ok).toBe(false);
  const empty = await runSaveProject(deps, { title: "   " });
  expect(empty.ok).toBe(false);
  const badUrl = await runSaveProject(deps, { title: "Sumi", url: "not-a-url", tech: ["next"] });
  expect(badUrl.ok).toBe(false);
  const badGallery = await runSaveProject(deps, {
    title: "Sumi",
    gallery: ["https://cdn.example/ok.png", "not-a-url"],
  });
  expect(badGallery.ok).toBe(false);
  const ok = await runSaveProject(deps, {
    title: "Sumi Engine",
    description: "d",
    url: "https://sumi.example",
    tech: ["next", "drizzle"],
    gallery: ["https://cdn.example/1.png", "https://cdn.example/2.png"],
    featured: true,
    order: 2,
  });
  expect(ok.ok).toBe(true);
  if (ok.ok) expect(ok.data.slug).toBe("proj");
  expect(deps.store!.saveProject).toHaveBeenCalledWith(
    "alice",
    expect.objectContaining({ gallery: ["https://cdn.example/1.png", "https://cdn.example/2.png"] }),
  );
  const del = await runDeleteProject(deps, "sumi-engine");
  expect(del.ok).toBe(true);
  const guardDel = await runDeleteProject({ userId: null, handle: null, store: null }, "sumi-engine");
  expect(guardDel.ok).toBe(false);
});

test("page save guards, rejects empty body, and deletes", async () => {
  const guard = await runSavePage({ userId: null, handle: null, store: null }, { title: "X", body: "x" });
  expect(guard.ok).toBe(false);
  const empty = await runSavePage(deps, { title: "About", body: "   " });
  expect(empty.ok).toBe(false);
  const ok = await runSavePage(deps, { title: " About ", description: "who", body: "# hi", showInNav: true });
  expect(ok.ok).toBe(true);
  if (ok.ok) expect(ok.data.slug).toBe("pg");
  const del = await runDeletePage(deps, "about");
  expect(del.ok).toBe(true);
  const guardDel = await runDeletePage({ userId: null, handle: null, store: null }, "about");
  expect(guardDel.ok).toBe(false);
});

function storeWithComments(listComments: () => Promise<Comment[]>, addComment: () => Promise<Comment>) {
  return { ...fakeStore(), listComments, addComment } as ContentStore;
}

function storeWithLikes(likedBy: string[]) {
  return {
    ...fakeStore(),
    async listLikes() { return [...likedBy]; },
    async addLike(_h, _s, handle) { likedBy.push(handle); },
    async removeLike(_h, _s, handle) { likedBy.splice(likedBy.indexOf(handle), 1); },
  } as ContentStore;
}

function storeWithFollows(follows: string[]) {
  return {
    ...fakeStore(),
    async listFollowing() { return [...follows]; },
    async listFollowers() { return [...follows]; },
    async addFollow(_f, e) { follows.push(e); },
    async removeFollow(_f, e) { follows.splice(follows.indexOf(e), 1); },
  } as ContentStore;
}

test("toggleFollow follows then unfollows and reports follower count", async () => {
  const store = storeWithFollows([]);
  const d = { userId: "u1", handle: "alice", store };
  const now = new Date("2026-01-01T00:00:00Z");
  const on = await runToggleFollow(d, { followee: "bob" }, now);
  expect(on.ok).toBe(true);
  if (on.ok) expect(on.data).toEqual({ following: true, count: 1 });
  const off = await runToggleFollow(d, { followee: "bob" }, now);
  expect(off.ok).toBe(true);
  if (off.ok) expect(off.data).toEqual({ following: false, count: 0 });
});

test("deleteComment guards, authorizes, and removes", async () => {
  const comments = [
    { id: "c1", handle: "bob", date: "t", body: "hi" },
    { id: "c2", handle: "eve", date: "t", body: "spam" },
  ];
  const withComments = { ...fakeStore(), async listComments() { return comments; }, async deleteComment() {} } as unknown as ContentStore;
  const okBob = await runDeleteComment({ userId: "u1", handle: "bob", store: withComments }, { postHandle: "alice", slug: "p", commentId: "c1" });
  expect(okBob.ok).toBe(true);
  const asAlicePostAuthor = await runDeleteComment({ userId: "u2", handle: "alice", store: withComments }, { postHandle: "alice", slug: "p", commentId: "c2" });
  expect(asAlicePostAuthor.ok).toBe(true);
  const asEveAuthor = await runDeleteComment({ userId: "u3", handle: "eve", store: withComments }, { postHandle: "alice", slug: "p", commentId: "c2" });
  expect(asEveAuthor.ok).toBe(true);
  const asOther = await runDeleteComment({ userId: "u9", handle: "mallory", store: withComments }, { postHandle: "alice", slug: "p", commentId: "c2" });
  expect(asOther.ok).toBe(false);
  const unsigned = await runDeleteComment({ userId: null, handle: null, store: null }, { postHandle: "alice", slug: "p", commentId: "c1" });
  expect(unsigned.ok).toBe(false);
  const missing = await runDeleteComment({ userId: "u1", handle: "bob", store: withComments }, { postHandle: "alice", slug: "p", commentId: "nope" });
  expect(missing.ok).toBe(false);
});

test("toggleFollow rejects following yourself and unsigned", async () => {
  const store = storeWithFollows([]);
  const now = new Date("2026-01-01T00:00:00Z");
  const self = await runToggleFollow({ userId: "u1", handle: "alice", store }, { followee: "alice" }, now);
  expect(self.ok).toBe(false);
  if (!self.ok) expect(self.error).toContain("yourself");
  const unsigned = await runToggleFollow({ userId: null, handle: null, store: null }, { followee: "bob" }, now);
  expect(unsigned.ok).toBe(false);
  const bad = await runToggleFollow({ userId: "u1", handle: "alice", store }, {}, now);
  expect(bad.ok).toBe(false);
});

test("toggleLike likes, toggling back unlikes", async () => {
  const store = storeWithLikes([]);
  const d = { userId: "u1", handle: "alice", store };
  const on = await runToggleLike(d, { postHandle: "bob", slug: "hello" }, new Date("2025-01-01T00:00:00.000Z"));
  expect(on.ok).toBe(true);
  if (on.ok) expect(on.data).toEqual({ liked: true, count: 1 });
  const off = await runToggleLike(d, { postHandle: "bob", slug: "hello" }, new Date("2025-01-01T00:00:00.000Z"));
  expect(off.ok).toBe(true);
  if (off.ok) expect(off.data).toEqual({ liked: false, count: 0 });
});

test("runGetLikeState reports whether signed-in user has liked", async () => {
  const store = storeWithLikes(["bob", "carol"]);
  const res = await runGetLikeState({ userId: "u1", handle: "carol", store }, { postHandle: "bob", slug: "hello" });
  expect(res.ok).toBe(true);
  if (res.ok) expect(res.data).toEqual({ liked: true, count: 2 });
});

test("like/toggle are guarded and validated when unsigned", async () => {
  const guarded = await runToggleLike({ userId: null, handle: null, store: null }, { postHandle: "bob", slug: "x" }, new Date());
  expect(guarded.ok).toBe(false);
  const bad = await runToggleLike({ userId: "u1", handle: "alice", store: fakeStore() }, {}, new Date());
  expect(bad.ok).toBe(false);
  const stateGuarded = await runGetLikeState({ userId: null, handle: null, store: null }, { postHandle: "bob", slug: "x" });
  expect(stateGuarded.ok).toBe(false);
});

const chain: Comment[] = [
  { id: "r1", handle: "a", date: "t", body: "" },
  { id: "r2", handle: "a", date: "t", body: "", parentId: "r1" },
  { id: "r3", handle: "a", date: "t", body: "", parentId: "r2" },
  { id: "r4", handle: "a", date: "t", body: "", parentId: "r3" },
];

test("addComment allows a reply within the max depth", async () => {
  const store = storeWithComments(
    async () => chain,
    async () => ({ id: "new", handle: "alice", date: "t", body: "deep" }),
  );
  const res = await runAddComment(
    { userId: "u1", handle: "alice", store },
    { postHandle: "p", slug: "s", body: "ok", parentId: "r3" },
    new Date(),
  );
  expect(res.ok).toBe(true);
});

test("addComment rejects a reply that would exceed the max depth", async () => {
  const store = storeWithComments(
    async () => chain,
    async () => ({ id: "new", handle: "alice", date: "t", body: "deep" }),
  );
  const res = await runAddComment(
    { userId: "u1", handle: "alice", store },
    { postHandle: "p", slug: "s", body: "too deep", parentId: "r4" },
    new Date(),
  );
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error).toContain("maximum depth");
});

test("note add guards, trims, and deletes", async () => {
  const ok = await runAddNote(deps, { body: "  a fleeting thought " }, new Date("2026-01-01T00:00:00.000Z"));
  expect(ok.ok).toBe(true);
  if (ok.ok) {
    expect(ok.data.body).toBe("a fleeting thought");
    expect(ok.data.handle).toBe("alice");
    expect(ok.data.date).toBe("2026-01-01T00:00:00.000Z");
  }
  const empty = await runAddNote(deps, { body: "   " }, new Date());
  expect(empty.ok).toBe(false);
  const guarded = await runAddNote({ userId: null, handle: null, store: null }, { body: "x" }, new Date());
  expect(guarded.ok).toBe(false);
  const del = await runDeleteNote(deps, { id: "n1" });
  expect(del.ok).toBe(true);
  const guardedDel = await runDeleteNote({ userId: null, handle: null, store: null }, { id: "n1" });
  expect(guardedDel.ok).toBe(false);
});

test("friend add validates URL and deletes", async () => {
  const ok = await runAddFriend(
    deps,
    { name: " Moe ", url: "https://moeblog.example", bio: "a friend" },
    new Date("2026-01-01T00:00:00.000Z"),
  );
  expect(ok.ok).toBe(true);
  if (ok.ok) {
    expect(ok.data.name).toBe("Moe");
    expect(ok.data.url).toBe("https://moeblog.example");
    expect(ok.data.bio).toBe("a friend");
  }
  const badScheme = await runAddFriend(deps, { name: "X", url: "ftp://x.example" }, new Date());
  expect(badScheme.ok).toBe(false);
  const missingUrl = await runAddFriend(deps, { name: "X", url: "" }, new Date());
  expect(missingUrl.ok).toBe(false);
  const guarded = await runAddFriend({ userId: null, handle: null, store: null }, { name: "X", url: "https://x.example" }, new Date());
  expect(guarded.ok).toBe(false);
  const del = await runDeleteFriend(deps, { id: "f1" });
  expect(del.ok).toBe(true);
  const guardedDel = await runDeleteFriend({ userId: null, handle: null, store: null }, { id: "f1" });
  expect(guardedDel.ok).toBe(false);
});

test("addComment rejects a reply to a missing parent", async () => {
  const store = storeWithComments(
    async () => chain,
    async () => ({ id: "new", handle: "alice", date: "t", body: "" }),
  );
  const res = await runAddComment(
    { userId: "u1", handle: "alice", store },
    { postHandle: "p", slug: "s", body: "x", parentId: "ghost" },
    new Date(),
  );
  expect(res.ok).toBe(false);
});

function notifyingStore() {
  const notifications: Notification[] = [];
  const likes: string[] = [];
  const follows: string[] = [];
  const store: ContentStore = {
    ...fakeStore(),
    async listLikes() { return [...likes]; },
    async addLike(_h, _s, handle) { likes.push(handle); },
    async removeLike(_h, _s, handle) { likes.splice(likes.indexOf(handle), 1); },
    async listFollowing() { return [...follows]; },
    async listFollowers() { return [...follows]; },
    async addFollow(_f, e) { follows.push(e); },
    async removeFollow(_f, e) { follows.splice(follows.indexOf(e), 1); },
    async listNotifications(handle) { return notifications.filter((n) => n.handle === handle); },
    async addNotification(handle, n: NewNotification, now) {
      const full: Notification = { id: `ntf-${notifications.length + 1}`, handle, date: now.toISOString(), read: false, ...n };
      notifications.push(full);
      return full;
    },
    async markNotificationsRead(handle) {
      let marked = 0;
      for (const n of notifications) {
        if (n.handle === handle && !n.read) {
          n.read = true;
          marked += 1;
        }
      }
      return marked;
    },
  };
  return { store, notifications };
}

test("commenting on someone else's post notifies the post author", async () => {
  const { store, notifications } = notifyingStore();
  const res = await runAddComment(
    { userId: "u1", handle: "alice", store },
    { postHandle: "bob", slug: "hello", body: "Nice one" },
    new Date("2026-01-01T00:00:00.000Z"),
  );
  expect(res.ok).toBe(true);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({
    handle: "bob",
    type: "comment",
    actor: "alice",
    postHandle: "bob",
    postSlug: "hello",
    commentId: "cid",
    body: "Nice one",
  });
});

test("commenting on your own post does not notify yourself", async () => {
  const { store, notifications } = notifyingStore();
  const res = await runAddComment(
    { userId: "u1", handle: "alice", store },
    { postHandle: "alice", slug: "hello", body: "hi" },
    new Date("2026-01-01T00:00:00.000Z"),
  );
  expect(res.ok).toBe(true);
  expect(notifications).toHaveLength(0);
});

test("replying notifies the post author with the reply type", async () => {
  const { store, notifications } = notifyingStore();
  const withChain = { ...store, async listComments() { return chain; } } as ContentStore;
  const res = await runAddComment(
    { userId: "u1", handle: "alice", store: withChain },
    { postHandle: "bob", slug: "hello", body: "In reply", parentId: "r1" },
    new Date("2026-01-01T00:00:00.000Z"),
  );
  expect(res.ok).toBe(true);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({
    handle: "bob",
    type: "reply",
    actor: "alice",
    commentId: "cid",
  });
});

test("liking notifies the post author and dedupes a same-day repeat", async () => {
  const { store, notifications } = notifyingStore();
  const d = { userId: "u1", handle: "alice", store };
  const now = new Date("2026-01-01T00:00:00.000Z");
  expect((await runToggleLike(d, { postHandle: "bob", slug: "hello" }, now)).ok).toBe(true);
  expect((await runToggleLike(d, { postHandle: "bob", slug: "hello" }, now)).ok).toBe(true);
  expect((await runToggleLike(d, { postHandle: "bob", slug: "hello" }, now)).ok).toBe(true);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({
    handle: "bob",
    type: "like",
    actor: "alice",
    postHandle: "bob",
    postSlug: "hello",
  });
});

test("following notifies the followee, self-follow stays rejected", async () => {
  const { store, notifications } = notifyingStore();
  const now = new Date("2026-01-01T00:00:00.000Z");
  const res = await runToggleFollow({ userId: "u1", handle: "bob", store }, { followee: "alice" }, now);
  expect(res.ok).toBe(true);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({ handle: "alice", type: "follow", actor: "bob" });
  const self = await runToggleFollow({ userId: "u1", handle: "alice", store }, { followee: "alice" }, now);
  expect(self.ok).toBe(false);
  expect(notifications).toHaveLength(1);
});

test("markNotificationsRead guards and marks unread as read", async () => {
  const { store, notifications } = notifyingStore();
  await runToggleFollow(
    { userId: "u1", handle: "bob", store },
    { followee: "alice" },
    new Date("2026-01-01T00:00:00.000Z"),
  );
  const res = await runMarkNotificationsRead({ userId: "u1", handle: "alice", store });
  expect(res.ok).toBe(true);
  if (res.ok) expect(res.data).toBe(1);
  expect(notifications.every((n) => n.read)).toBe(true);
  const guarded = await runMarkNotificationsRead({ userId: null, handle: null, store: null });
  expect(guarded.ok).toBe(false);
});
