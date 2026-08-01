import { expect, test } from "vitest";
import type { ContentStore } from "@/content/store";
import { runAddComment, runDeleteMagazine, runSaveMagazine, runSaveProfile } from "./actions-core";

function fakeStore(): ContentStore {
  return {
    async listHandles() { return []; },
    async listPosts() { return []; },
    async getPost() { return null; },
    async savePost() { return "x"; },
    async deletePost() {},
    async uploadImage() { return ""; },
    async listComments() { return []; },
    async addComment(_p, _s, c, author, now) { return { ...c, handle: author, date: now.toISOString() }; },
    async getProfile() { return null; },
    async saveProfile() {},
    async listMagazines() { return []; },
    async getMagazine() { return null; },
    async saveMagazine(handle, m) { return m.title.toLowerCase().replace(/\s+/g, "-"); },
    async deleteMagazine() {},
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
