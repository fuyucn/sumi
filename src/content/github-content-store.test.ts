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

// ---- Notes (手记) ----
test("notes round-trip newest-first and delete", async () => {
  const store = new GitHubContentStore(fakeClient());
  const n1 = await store.addNote("alice", { body: "first thought" }, new Date("2026-01-01T00:00:00.000Z"));
  const n2 = await store.addNote("alice", { body: "second thought" }, new Date("2026-01-02T00:00:00.000Z"));
  const notes = await store.listNotes("alice");
  expect(notes.map((n) => n.body)).toEqual(["second thought", "first thought"]);
  expect(notes[0].handle).toBe("alice");
  expect(notes[0].date).toBe("2026-01-02T00:00:00.000Z");

  await store.deleteNote("alice", n1.id);
  expect((await store.listNotes("alice")).map((n) => n.id)).toEqual([n2.id]);
});

test("listNotes returns [] when a creator has no notes directory", async () => {
  const store = new GitHubContentStore(fakeClient());
  expect(await store.listNotes("ghost")).toEqual([]);
});

// ---- Friends (友链) ----
test("friends round-trip and delete", async () => {
  const store = new GitHubContentStore(fakeClient());
  const f = await store.addFriend(
    { name: "Moe", url: "https://moeblog.example", bio: "a friend" },
    new Date("2026-01-01T00:00:00.000Z"),
  );
  expect(f.id).toBeTruthy();
  expect(f.createdAt).toBe("2026-01-01T00:00:00.000Z");

  const friends = await store.listFriends();
  expect(friends).toHaveLength(1);
  expect(friends[0].name).toBe("Moe");
  expect(friends[0].url).toBe("https://moeblog.example");
  expect(friends[0].bio).toBe("a friend");

  await store.deleteFriend(f.id);
  expect(await store.listFriends()).toEqual([]);
});

test("listFriends returns [] when no friends file exists", async () => {
  const store = new GitHubContentStore(fakeClient());
  expect(await store.listFriends()).toEqual([]);
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

test("addComment stores a stable id and preserves a parent reference", async () => {
  const store = new GitHubContentStore(fakeClient());
  const parent = await store.addComment("alice", "hello", { body: "root" }, "bob", new Date("2026-06-13T01:02:03.000Z"));
  const child = await store.addComment("alice", "hello", { body: "reply", parentId: parent.id }, "carol", new Date("2026-06-13T01:03:00.000Z"));
  expect(parent.id).toBeTruthy();
  expect(child.parentId).toBe(parent.id);
  const comments = await store.listComments("alice", "hello");
  expect(comments).toHaveLength(2);
  const root = comments.find((c) => c.id === parent.id)!;
  const reply = comments.find((c) => c.id === child.id)!;
  expect(root.parentId).toBeUndefined();
  expect(reply.parentId).toBe(parent.id);
});

// ---- Search ----
test("searchPosts matches title, body, excerpt, and tags across published posts", async () => {
  const store = new GitHubContentStore(fakeClient());
  await store.savePost("alice", {
    title: "Postgres notes", body: "about the mirror", tags: ["db"],
    status: "published", publishedAt: "2026-06-10T00:00:00.000Z",
  });
  await store.savePost("alice", {
    title: "Cooking", body: "a recipe for ramen", excerpt: "noodles", tags: ["food"],
    status: "published", publishedAt: "2026-06-11T00:00:00.000Z",
  });
  // drafts must never appear
  await store.savePost("alice", {
    title: "Secret notes", body: "draft mirror draft", tags: ["db"],
    status: "draft",
  });

  expect((await store.searchPosts("mirror")).map((r) => r.post.slug)).toEqual(["postgres-notes"]);
  expect((await store.searchPosts("ramen")).map((r) => r.post.slug)).toEqual(["cooking"]);
  expect((await store.searchPosts("db")).map((r) => r.post.slug)).toEqual(["postgres-notes"]);
  expect(await store.searchPosts("nope")).toEqual([]);
  expect(await store.searchPosts("   ")).toEqual([]);
});

test("searchPosts returns newest-first and includes the handle", async () => {
  const store = new GitHubContentStore(fakeClient());
  await store.savePost("alice", { title: "Note A", body: "keyword", status: "published", publishedAt: "2026-06-01T00:00:00.000Z" });
  await store.savePost("bob", { title: "Note B", body: "keyword", status: "published", publishedAt: "2026-06-10T00:00:00.000Z" });
  const results = await store.searchPosts("keyword");
  expect(results.map((r) => `${r.handle}/${r.post.slug}`)).toEqual(["bob/note-b", "alice/note-a"]);
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

// ---- Projects / Pages ----
test("project CRUD, featured-first ordering, and delete", async () => {
  const store = new GitHubContentStore(fakeClient());
  const slug = await store.saveProject("alice", {
    title: "Sumi Engine",
    description: "a full-stack space",
    url: "https://sumi.example",
    repo: "https://github.com/example/sumi",
    tech: ["next", "drizzle"],
    featured: true,
    order: 2,
  });
  expect(slug).toBe("sumi-engine");
  const project = await store.getProject("alice", "sumi-engine");
  expect(project).toMatchObject({
    slug: "sumi-engine",
    handle: "alice",
    title: "Sumi Engine",
    description: "a full-stack space",
    url: "https://sumi.example",
    repo: "https://github.com/example/sumi",
    tech: ["next", "drizzle"],
    featured: true,
    order: 2,
  });
  expect(project?.createdAt).toBeTruthy();
  expect(project?.updatedAt).toBeTruthy();

  // featured sorts first, order breaks ties within a tier, title breaks the rest
  await store.saveProject("alice", { title: "Alpha", order: 1 });
  await store.saveProject("alice", { title: "Beta", featured: true, order: 1 });
  expect((await store.listProjects("alice")).map((p) => p.title)).toEqual([
    "Beta",
    "Sumi Engine",
    "Alpha",
  ]);

  await store.deleteProject("alice", "sumi-engine");
  expect(await store.getProject("alice", "sumi-engine")).toBeNull();
});

test("page CRUD and delete", async () => {
  const store = new GitHubContentStore(fakeClient());
  const slug = await store.savePage("alice", {
    title: "About Me",
    description: "who I am",
    body: "# About\n\nhello",
    showInNav: true,
  });
  expect(slug).toBe("about-me");
  const page = await store.getPage("alice", "about-me");
  expect(page).toMatchObject({
    slug: "about-me",
    handle: "alice",
    title: "About Me",
    description: "who I am",
    body: "# About\n\nhello",
    showInNav: true,
  });
  expect((await store.listPages("alice")).map((p) => p.slug)).toEqual(["about-me"]);
  await store.deletePage("alice", "about-me");
  expect(await store.getPage("alice", "about-me")).toBeNull();
  expect(await store.listPages("alice")).toEqual([]);
});

test("projects and pages dirs do not leak into listPosts", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "One", body: "a", status: "published" });
  await store.saveProject("alice", { title: "Proj" });
  await store.savePage("alice", { title: "Page", body: "x" });
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

// ---- Notifications ----
test("notifications round-trip newest-first and mark read", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  const t1 = new Date("2026-01-02T00:00:00.000Z");
  const t2 = new Date("2026-01-01T00:00:00.000Z");
  const like = await store.addNotification(
    "alice",
    { type: "like", actor: "bob", postHandle: "alice", postSlug: "hello" },
    t1,
  );
  const comment = await store.addNotification(
    "alice",
    { type: "comment", actor: "carol", postHandle: "alice", postSlug: "hello", body: "Nice post!" },
    t2,
  );
  expect(like.read).toBe(false);
  expect(comment.read).toBe(false);

  const list = await store.listNotifications("alice");
  expect(list.map((n) => n.id)).toEqual([like.id, comment.id]);
  expect(list[0]).toMatchObject({ type: "like", actor: "bob", postHandle: "alice", postSlug: "hello" });
  expect(list[1]).toMatchObject({ type: "comment", actor: "carol", body: "Nice post!" });

  expect(await store.markNotificationsRead("alice")).toBe(2);
  const read = await store.listNotifications("alice");
  expect(read.every((n) => n.read)).toBe(true);
  expect(await store.markNotificationsRead("alice")).toBe(0);
});

test("listNotifications returns [] when no notifications file exists", async () => {
  const store = new GitHubContentStore(fakeClient());
  expect(await store.listNotifications("alice")).toEqual([]);
  expect(await store.markNotificationsRead("alice")).toBe(0);
});
