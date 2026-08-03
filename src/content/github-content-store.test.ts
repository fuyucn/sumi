import { expect, test } from "vitest";
import type { GitHubClient, RepoFile, DirEntry } from "@/lib/github";
import { GitHubContentStore } from "./github-content-store";

function fakeClient(): GitHubClient & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    async getFile(path): Promise<RepoFile | null> {
      return files.has(path) ? { content: files.get(path)!, sha: "sha-" + path } : null;
    },
    async listDir(path): Promise<DirEntry[]> {
      const prefix = path.endsWith("/") ? path : path + "/";
      const names = new Set<string>();
      const entries: DirEntry[] = [];
      for (const key of files.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const top = rest.split("/")[0];
        if (names.has(top)) continue;
        names.add(top);
        const isDir = rest.includes("/");
        entries.push({ name: top, path: prefix + top, type: isDir ? "dir" : "file" });
      }
      return entries;
    },
    async putTextFile(path, text) { files.set(path, text); },
    async putBinaryFile(path) { files.set(path, "<binary>"); },
    async deleteFile(path) { files.delete(path); },
  };
}

test("savePost writes index.md and getPost reads it back", async () => {
  const store = new GitHubContentStore(fakeClient());
  const slug = await store.savePost("alice", {
    title: "My First Post", body: "# Hi\n\nhello", tags: ["intro"],
    status: "published", publishedAt: "2026-06-12T00:00:00.000Z",
  });
  expect(slug).toBe("my-first-post");
  const post = await store.getPost("alice", "my-first-post");
  expect(post?.title).toBe("My First Post");
  expect(post?.tags).toEqual(["intro"]);
  expect(post?.body).toContain("hello");
});

test("getPost returns null for a missing post", async () => {
  const store = new GitHubContentStore(fakeClient());
  expect(await store.getPost("alice", "nope")).toBeNull();
});

test("listPosts returns metadata for a creator, filterable by status", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "One", body: "a", status: "published" });
  await store.savePost("alice", { title: "Two", body: "b", status: "draft" });
  const all = await store.listPosts({ handle: "alice" });
  expect(all.map((p) => p.slug).sort()).toEqual(["one", "two"]);
  const published = await store.listPosts({ handle: "alice", status: "published" });
  expect(published.map((p) => p.slug)).toEqual(["one"]);
});

test("uploadImage stores under images/ and returns the in-post relative path", async () => {
  const store = new GitHubContentStore(fakeClient());
  const rel = await store.uploadImage("alice", "my-post", "cover.png", new Uint8Array([1, 2, 3]));
  expect(rel).toBe("images/cover.png");
});

test("deletePost removes the post files", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "Bye", body: "x", status: "draft" });
  await store.deletePost("alice", "bye");
  expect(await store.getPost("alice", "bye")).toBeNull();
});

test("listHandles returns all creator handles with content", async () => {
  const store = new GitHubContentStore(fakeClient());
  await store.savePost("alice", { title: "A", body: "a", status: "published" });
  await store.savePost("bob", { title: "B", body: "b", status: "draft" });
  const handles = await store.listHandles();
  expect(handles.sort()).toEqual(["alice", "bob"]);
});

test("deletePost recurses into the images/ subdir and removes everything", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "With Image", body: "x", status: "draft" });
  await store.uploadImage("alice", "with-image", "cover.png", new Uint8Array([1, 2, 3]));
  // both the article file and the nested image exist
  expect([...client.files.keys()].some((k) => k.includes("/images/cover.png"))).toBe(true);

  await store.deletePost("alice", "with-image");

  // nothing under the post dir remains (recursive delete reached images/)
  const remaining = [...client.files.keys()].filter((k) => k.includes("content/@alice/with-image"));
  expect(remaining).toEqual([]);
});

// ---- Comments ----
test("addComment writes a file and listComments reads it back", async () => {
  const store = new GitHubContentStore(fakeClient());
  const added = await store.addComment("alice", "hello", { body: "great read" }, "bob", new Date("2026-06-13T01:02:03.000Z"));
  expect(added.handle).toBe("bob");
  const comments = await store.listComments("alice", "hello");
  expect(comments).toHaveLength(1);
  expect(comments[0].handle).toBe("bob");
  expect(comments[0].body).toContain("great read");
});

test("listComments returns nothing when there are no comments", async () => {
  const store = new GitHubContentStore(fakeClient());
  expect(await store.listComments("alice", "hello")).toEqual([]);
});

// ---- Profile ----
test("getProfile returns null when absent, saveProfile round-trips", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  expect(await store.getProfile("alice")).toBeNull();
  await store.saveProfile("alice", { displayName: "Alice", bio: "hi" });
  expect(await store.getProfile("alice")).toEqual({ displayName: "Alice", bio: "hi" });
  // save again (existing sha path)
  await store.saveProfile("alice", { displayName: "A" });
  expect(await store.getProfile("alice")).toEqual({ displayName: "A" });
});

// ---- Magazines ----
test("magazine CRUD", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  const slug = await store.saveMagazine("alice", { title: "My Zine", description: "desc", items: ["one"] });
  expect(slug).toBe("my-zine");
  expect(await store.getMagazine("alice", "my-zine")).toEqual({ slug: "my-zine", title: "My Zine", description: "desc", items: ["one"] });
  const list = await store.listMagazines("alice");
  expect(list.map((m) => m.slug)).toEqual(["my-zine"]);
  await store.deleteMagazine("alice", "my-zine");
  expect(await store.getMagazine("alice", "my-zine")).toBeNull();
  expect(await store.listMagazines("alice")).toEqual([]);
});

test("magazines dir does not leak into listPosts", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "One", body: "a", status: "published" });
  await store.saveMagazine("alice", { title: "Zine", items: [] });
  const posts = await store.listPosts({ handle: "alice" });
  expect(posts.map((p) => p.slug)).toEqual(["one"]);
});

// ---- Tags ----
test("listTags counts published post tags across handles, drafts excluded, sorted by count desc then name asc", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "Alpha", body: "a", tags: ["js", "web"], status: "published" });
  await store.savePost("alice", { title: "Beta", body: "b", tags: ["js"], status: "published" });
  // draft tags must NOT be counted
  await store.savePost("alice", { title: "Gamma", body: "c", tags: ["js", "secret"], status: "draft" });
  await store.savePost("bob", { title: "Delta", body: "d", tags: ["js", "prose", "web"], status: "published" });
  await store.savePost("carol", { title: "Epsilon", body: "e", tags: ["art"], status: "published" });

  const tags = await store.listTags();
  expect(tags).toEqual([
    { name: "js", count: 3 },
    { name: "web", count: 2 },
    { name: "art", count: 1 },
    { name: "prose", count: 1 },
  ]);
});

test("listTags returns empty when there are no published posts", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "Only Draft", body: "d", tags: ["js"], status: "draft" });
  expect(await store.listTags()).toEqual([]);
});
