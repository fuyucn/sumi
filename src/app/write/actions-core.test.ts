import { expect, test, vi } from "vitest";
import type { ContentStore } from "@/content/store";
import { runDeletePost, runSavePost, runUploadImage } from "./actions-core";

const now = new Date("2026-06-13T12:00:00.000Z");

function fakeStore(): ContentStore {
  return {
    listHandles: vi.fn(),
    listPosts: vi.fn(),
    getPost: vi.fn(),
    savePost: vi.fn().mockResolvedValue("hi"),
    deletePost: vi.fn().mockResolvedValue(undefined),
    uploadImage: vi.fn().mockResolvedValue("images/x.png"),
    listComments: vi.fn().mockResolvedValue([]),
    addComment: vi.fn(),
    listLikes: vi.fn().mockResolvedValue([]),
    addLike: vi.fn(),
    removeLike: vi.fn(),
    getProfile: vi.fn().mockResolvedValue(null),
    saveProfile: vi.fn().mockResolvedValue(undefined),
    listMagazines: vi.fn().mockResolvedValue([]),
    getMagazine: vi.fn().mockResolvedValue(null),
    saveMagazine: vi.fn().mockResolvedValue("zine"),
    deleteMagazine: vi.fn().mockResolvedValue(undefined),
    listTags: vi.fn().mockResolvedValue([]),
    searchPosts: vi.fn().mockResolvedValue([]),
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

const bytes = new Uint8Array([1, 2, 3]);

test("runUploadImage: not signed in → error", async () => {
  const r = await runUploadImage(
    { userId: null, handle: null, store: null },
    { title: "My Post", filename: "photo.png", bytes },
  );
  expect(r).toEqual({ ok: false, error: expect.stringContaining("signed in") });
});

test("runUploadImage: empty title → error, store.uploadImage NOT called", async () => {
  const store = fakeStore();
  const r = await runUploadImage(
    { userId: "u", handle: "alice", store },
    { title: "  ", filename: "photo.png", bytes },
  );
  expect(r).toEqual({ ok: false, error: expect.stringContaining("title") });
  expect(store.uploadImage).not.toHaveBeenCalled();
});

test("runUploadImage: happy path → returns ok path, calls store.uploadImage with safe name", async () => {
  const store = fakeStore();
  (store.uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue("images/my-photo.png");
  const r = await runUploadImage(
    { userId: "u", handle: "alice", store },
    { title: "My Post", filename: "My Photo.PNG", bytes },
  );
  expect(r).toEqual({ ok: true, path: "images/my-photo.png" });
  expect(store.uploadImage).toHaveBeenCalledWith("alice", "my-post", "my-photo.png", bytes);
});
