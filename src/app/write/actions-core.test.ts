import { expect, test, vi } from "vitest";
import type { ContentStore } from "@/content/store";
import { runDeletePost, runSavePost } from "./actions-core";

const now = new Date("2026-06-13T12:00:00.000Z");

function fakeStore(): ContentStore {
  return {
    listHandles: vi.fn(),
    listPosts: vi.fn(),
    getPost: vi.fn(),
    savePost: vi.fn().mockResolvedValue("hi"),
    deletePost: vi.fn().mockResolvedValue(undefined),
    uploadImage: vi.fn(),
  };
}

test("runSavePost: not signed in → error", async () => {
  const r = await runSavePost({ userId: null, handle: null, store: null }, {}, now);
  expect(r).toEqual({ ok: false, error: expect.stringContaining("signed in") });
});

test("runSavePost: no content store configured → error", async () => {
  const r = await runSavePost({ userId: "u", handle: "alice", store: null }, { title: "Hi", body: "x" }, now);
  expect(r.ok).toBe(false);
});

test("runSavePost: invalid form (empty title) → error, store not called", async () => {
  const store = fakeStore();
  const r = await runSavePost({ userId: "u", handle: "alice", store }, { title: "", body: "x" }, now);
  expect(r.ok).toBe(false);
  expect(store.savePost).not.toHaveBeenCalled();
});

test("runSavePost: happy path → saves and returns slug", async () => {
  const store = fakeStore();
  const r = await runSavePost({ userId: "u", handle: "alice", store }, { title: "Hi", body: "x", publish: true }, now);
  expect(r).toEqual({ ok: true, slug: "hi" });
  expect(store.savePost).toHaveBeenCalledWith("alice", expect.objectContaining({ title: "Hi", status: "published" }));
});

test("runDeletePost: happy path calls store.deletePost", async () => {
  const store = fakeStore();
  const r = await runDeletePost({ userId: "u", handle: "alice", store }, "hi");
  expect(r).toEqual({ ok: true });
  expect(store.deletePost).toHaveBeenCalledWith("alice", "hi");
});

test("runDeletePost: not signed in → error", async () => {
  const r = await runDeletePost({ userId: null, handle: null, store: null }, "hi");
  expect(r.ok).toBe(false);
});
