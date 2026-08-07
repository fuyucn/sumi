import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { expect, test } from "vitest";
import { CloudflareContentStore, type D1Like, type D1PreparedStatementLike } from "./cloudflare-content-store";
import type { R2BucketLike } from "@/lib/r2";

/** Minimal in-memory D1 shim backed by better-sqlite3. */
function toD1(sqlite: Database.Database): D1Like {
  return {
    prepare(query: string) {
      const stmt = sqlite.prepare(query);
      const bound = (values: unknown[]): D1PreparedStatementLike => ({
        bind(...next: unknown[]) {
          return bound([...values, ...next]);
        },
        async first<T>() {
          return (stmt.all(...(values as never[])) as T[])[0] ?? null;
        },
        async all<T>() {
          const results = stmt.all(...(values as never[])) as T[];
          return { results, success: true };
        },
        async run() {
          stmt.run(...(values as never[]));
          return { success: true };
        },
      });
      return bound([]);
    },
  };
}

function inMemoryStore(opts: { bucket?: R2BucketLike } = {}) {
  const sqlite = new Database(":memory:");
  // Use the better-sqlite3 drizzle driver over the in-memory DB, then apply the
  // D1 schema DDL (multi-statement) via exec.
  drizzle(sqlite);
  sqlite.exec(DDL);
  const store = new CloudflareContentStore(toD1(sqlite), opts.bucket);
  return { store, sqlite };
}

const DDL = `
CREATE TABLE IF NOT EXISTS posts (
  handle TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  excerpt TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (handle, slug)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_handle TEXT NOT NULL,
  post_slug TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  body TEXT NOT NULL,
  date TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (
  post_handle TEXT NOT NULL,
  post_slug TEXT NOT NULL,
  liker_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_handle, post_slug, liker_handle)
);
CREATE TABLE IF NOT EXISTS follows (
  follower_handle TEXT NOT NULL,
  followee_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_handle, followee_handle)
);
CREATE TABLE IF NOT EXISTS magazines (
  handle TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (handle, slug)
);
CREATE TABLE IF NOT EXISTS profiles (
  handle TEXT PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  body TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  created_at TEXT NOT NULL
);
`;

function fakeBucket(): R2BucketLike & { map: Map<string, Uint8Array> } {
  const map = new Map<string, Uint8Array>();
  return {
    map,
    async put(key, value) {
      map.set(key, new Uint8Array(value as ArrayBuffer));
    },
    async get(key) {
      const v = map.get(key);
      if (!v) return null;
      return {
        async arrayBuffer() {
          return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer;
        },
      };
    },
    async delete(key) {
      map.delete(key);
    },
  };
}

test("savePost + getPost round-trip (tags, cover, publishedAt, status)", async () => {
  const { store } = inMemoryStore();
  const slug = await store.savePost("alice", {
    title: "My First Post",
    body: "# Hi\n\nhello",
    tags: ["intro", "notes"],
    excerpt: "short",
    coverImage: "/images/alice/cover.png",
    status: "published",
    publishedAt: "2026-06-12T00:00:00.000Z",
  });
  expect(slug).toBe("my-first-post");

  const post = await store.getPost("alice", "my-first-post");
  expect(post).not.toBeNull();
  expect(post?.title).toBe("My First Post");
  expect(post?.tags).toEqual(["intro", "notes"]);
  expect(post?.excerpt).toBe("short");
  expect(post?.coverImage).toBe("/images/alice/cover.png");
  expect(post?.status).toBe("published");
  expect(post?.publishedAt).toBe("2026-06-12T00:00:00.000Z");
  expect(post?.body).toContain("hello");
});

test("getPost returns null for a missing post", async () => {
  const { store } = inMemoryStore();
  expect(await store.getPost("alice", "nope")).toBeNull();
});

test("savePost upserts and preserves the same slug when title changes", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "Hello World", body: "v1" });
  const slug = await store.savePost("alice", { title: "Hello World", body: "v2", status: "published" });
  expect(slug).toBe("hello-world");
  const post = await store.getPost("alice", "hello-world");
  expect(post?.body).toBe("v2");
  expect(post?.status).toBe("published");
});

test("listPosts returns metadata and filters by draft vs published", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "One", body: "a", status: "published" });
  await store.savePost("alice", { title: "Two", body: "b", status: "draft" });
  const all = await store.listPosts({ handle: "alice" });
  expect(all.map((p) => p.slug).sort()).toEqual(["one", "two"]);
  // metadata has no body
  expect(all[0]).not.toHaveProperty("body");
  const published = await store.listPosts({ handle: "alice", status: "published" });
  expect(published.map((p) => p.slug)).toEqual(["one"]);
});

test("deletePost removes the post and its comments", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "Bye", body: "x", status: "draft" });
  await store.addComment("alice", "bye", { body: "hi" }, "bob", new Date("2026-06-01T00:00:00Z"));
  await store.deletePost("alice", "bye");
  expect(await store.getPost("alice", "bye")).toBeNull();
  expect(await store.listComments("alice", "bye")).toEqual([]);
});

test("deleteComment removes only the target comment, leaving siblings", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "Hi", body: "x", status: "published" });
  const c1 = await store.addComment("alice", "hi", { body: "one" }, "bob", new Date("2026-06-01T00:00:00Z"));
  const c2 = await store.addComment("alice", "hi", { body: "two" }, "carol", new Date("2026-06-01T00:00:00Z"));
  await store.deleteComment("alice", "hi", c1.id);
  const left = await store.listComments("alice", "hi");
  expect(left.map((c) => c.id)).toEqual([c2.id]);
});

test("likes toggle, dedupe, and cascade on delete", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "Hi", body: "x", status: "published" });
  expect(await store.listLikes("alice", "hi")).toEqual([]);
  await store.addLike("alice", "hi", "bob", new Date("2026-06-01T00:00:00Z"));
  await store.addLike("alice", "hi", "bob", new Date("2026-06-01T00:00:00Z"));
  await store.addLike("alice", "hi", "carol", new Date("2026-06-01T00:00:00Z"));
  expect(await store.listLikes("alice", "hi")).toEqual(["bob", "carol"]);
  await store.removeLike("alice", "hi", "bob");
  expect(await store.listLikes("alice", "hi")).toEqual(["carol"]);
  await store.deletePost("alice", "hi");
  expect(await store.listLikes("alice", "hi")).toEqual([]);
});

test("follows toggle, dedupe, and directional follower/following lists", async () => {
  const { store } = inMemoryStore();
  expect(await store.listFollowing("bob")).toEqual([]);
  await store.addFollow("bob", "alice", new Date("2026-06-01T00:00:00Z"));
  await store.addFollow("bob", "alice", new Date("2026-06-01T00:00:00Z"));
  await store.addFollow("carol", "alice", new Date("2026-06-01T00:00:00Z"));
  expect(await store.listFollowing("bob")).toEqual(["alice"]);
  expect(await store.listFollowers("alice")).toEqual(["bob", "carol"]);
  await store.removeFollow("bob", "alice");
  expect(await store.listFollowers("alice")).toEqual(["carol"]);
  expect(await store.listFollowing("bob")).toEqual([]);
});

test("listTags counts tags across published posts, count desc then name asc", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "A", body: "a", status: "published", tags: ["react", "js"] });
  await store.savePost("alice", { title: "B", body: "b", status: "published", tags: ["react", "css"] });
  await store.savePost("alice", { title: "Draft", body: "c", status: "draft", tags: ["secret"] });
  const tags = await store.listTags();
  expect(tags).toEqual([
    { name: "react", count: 2 },
    { name: "css", count: 1 },
    { name: "js", count: 1 },
  ]);
});

test("profile save + get (empty when absent, upsert round-trip)", async () => {
  const { store } = inMemoryStore();
  expect(await store.getProfile("alice")).toBeNull();
  await store.saveProfile("alice", { displayName: "Alice", bio: "hi" });
  expect(await store.getProfile("alice")).toEqual({ displayName: "Alice", bio: "hi" });
  await store.saveProfile("alice", { displayName: "A" });
  expect(await store.getProfile("alice")).toEqual({ displayName: "A" });
});

test("magazine CRUD", async () => {
  const { store } = inMemoryStore();
  const slug = await store.saveMagazine("alice", { title: "My Zine", description: "desc", items: ["one"] });
  expect(slug).toBe("my-zine");
  expect(await store.getMagazine("alice", "my-zine")).toEqual({
    slug: "my-zine",
    title: "My Zine",
    description: "desc",
    items: ["one"],
  });
  expect((await store.listMagazines("alice")).map((m) => m.slug)).toEqual(["my-zine"]);
  await store.deleteMagazine("alice", "my-zine");
  expect(await store.getMagazine("alice", "my-zine")).toBeNull();
  expect(await store.listMagazines("alice")).toEqual([]);
});

test("comments list/add round-trip sorted by date", async () => {
  const { store } = inMemoryStore();
  expect(await store.listComments("alice", "hello")).toEqual([]);
  await store.addComment("alice", "hello", { body: "first" }, "bob", new Date("2026-06-13T02:00:00Z"));
  await store.addComment("alice", "hello", { body: "later" }, "carol", new Date("2026-06-13T01:00:00Z"));
  const comments = await store.listComments("alice", "hello");
  expect(comments.map((c) => c.body)).toEqual(["later", "first"]);
});

test("comments support nesting via a parent id", async () => {
  const { store } = inMemoryStore();
  const root = await store.addComment("alice", "hello", { body: "root" }, "bob", new Date("2026-06-13T01:00:00Z"));
  const reply = await store.addComment("alice", "hello", { body: "reply", parentId: root.id }, "carol", new Date("2026-06-13T02:00:00Z"));
  expect(root.id).toBeTruthy();
  expect(reply.parentId).toBe(root.id);
  const comments = await store.listComments("alice", "hello");
  expect(comments.find((c) => c.id === root.id)?.parentId).toBeUndefined();
  expect(comments.find((c) => c.id === reply.id)?.parentId).toBe(root.id);
});

test("searchPosts matches title/body/excerpt/tags, published only, newest first", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "Postgres", body: "mirror notes", tags: ["db"], status: "published", publishedAt: "2026-06-10T00:00:00.000Z" });
  await store.savePost("alice", { title: "Cooking", body: "ramen recipe", excerpt: "noodles", tags: ["food"], status: "published", publishedAt: "2026-06-11T00:00:00.000Z" });
  await store.savePost("alice", { title: "Secret", body: "mirror mirror", tags: ["db"], status: "draft" });

  expect((await store.searchPosts("mirror")).map((r) => r.post.slug)).toEqual(["postgres"]);
  expect((await store.searchPosts("ramen")).map((r) => r.post.slug)).toEqual(["cooking"]);
  expect((await store.searchPosts("db")).map((r) => r.post.slug)).toEqual(["postgres"]);
  expect((await store.searchPosts("missing")).map((r) => r.handle)).toEqual([]);
});

test("listHandles returns handles with any content, distinct and sorted", async () => {
  const { store } = inMemoryStore();
  await store.savePost("alice", { title: "A", body: "a", status: "published" });
  await store.saveMagazine("bob", { title: "Zine" });
  await store.saveProfile("carol", { displayName: "Carol" });
  expect(await store.listHandles()).toEqual(["alice", "bob", "carol"]);
});

test("uploadImage stores bytes in the R2 stub and returns a URL", async () => {
  const bucket = fakeBucket();
  const { store } = inMemoryStore({ bucket });
  const url = await store.uploadImage("alice", "my-post", "cover.png", new Uint8Array([1, 2, 3]));
  const key = "alice/my-post/cover.png";
  expect(bucket.map.has(key)).toBe(true);
  expect([...bucket.map.get(key)!]).toEqual([1, 2, 3]);
  expect(url).toBe(`/images/${key}`);
});

test("uploadImage throws when no R2 bucket is configured", async () => {
  const { store } = inMemoryStore();
  await expect(store.uploadImage("alice", "p", "cover.png", new Uint8Array([1]))).rejects.toThrow(/R2 bucket/);
});

test("notes round-trip newest-first and delete", async () => {
  const { store } = inMemoryStore();
  const n1 = await store.addNote("alice", { body: "first thought" }, new Date("2026-01-01T00:00:00Z"));
  const n2 = await store.addNote("alice", { body: "second thought" }, new Date("2026-01-02T00:00:00Z"));
  expect(await store.listNotes("alice")).toEqual([
    { id: n2.id, handle: "alice", body: "second thought", date: "2026-01-02T00:00:00.000Z" },
    { id: n1.id, handle: "alice", body: "first thought", date: "2026-01-01T00:00:00.000Z" },
  ]);
  await store.deleteNote("alice", n1.id);
  expect((await store.listNotes("alice")).map((n) => n.id)).toEqual([n2.id]);
});

test("friends round-trip and delete", async () => {
  const { store } = inMemoryStore();
  const f = await store.addFriend(
    { name: "Moe", url: "https://moeblog.example", bio: "a friend" },
    new Date("2026-01-01T00:00:00Z"),
  );
  expect(await store.listFriends()).toEqual([
    {
      id: f.id,
      name: "Moe",
      url: "https://moeblog.example",
      bio: "a friend",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ]);
  await store.deleteFriend(f.id);
  expect(await store.listFriends()).toEqual([]);
});
