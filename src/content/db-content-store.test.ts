import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { expect, test } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema, sumiImages } from "@/db/schema";
import { DbContentStore } from "./db-content-store";

// The Postgres mirror tables as DDL (mirrors drizzle/0001_grey_aqueduct.sql).
const DDL = `
CREATE TABLE "sumi_posts" (
  "handle" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "tags" text DEFAULT '[]' NOT NULL,
  "excerpt" text,
  "cover_image" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" text,
  "agent" boolean DEFAULT false NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  CONSTRAINT "sumi_posts_handle_slug_pk" PRIMARY KEY("handle","slug")
);
CREATE TABLE "sumi_comments" (
  "id" text PRIMARY KEY NOT NULL,
  "post_handle" text NOT NULL,
  "post_slug" text NOT NULL,
  "author_handle" text NOT NULL,
  "body" text NOT NULL,
  "date" text NOT NULL,
  "parent_id" text,
  "created_at" text NOT NULL
);
CREATE TABLE "sumi_magazines" (
  "handle" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "items" text DEFAULT '[]' NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  CONSTRAINT "sumi_magazines_handle_slug_pk" PRIMARY KEY("handle","slug")
);
CREATE TABLE "sumi_profiles" (
  "handle" text PRIMARY KEY NOT NULL,
  "display_name" text,
  "bio" text,
  "updated_at" text NOT NULL
);
CREATE TABLE "sumi_images" (
  "id" text PRIMARY KEY NOT NULL,
  "handle" text NOT NULL,
  "slug" text NOT NULL,
  "filename" text NOT NULL,
  "mime" text NOT NULL,
  "bytes" "bytea" NOT NULL,
  "created_at" text NOT NULL
);
CREATE TABLE "sumi_likes" (
  "post_handle" text NOT NULL,
  "post_slug" text NOT NULL,
  "liker_handle" text NOT NULL,
  "created_at" text NOT NULL,
  CONSTRAINT "sumi_likes_post_handle_post_slug_liker_handle_pk" PRIMARY KEY("post_handle","post_slug","liker_handle")
);
CREATE TABLE "sumi_follows" (
  "follower_handle" text NOT NULL,
  "followee_handle" text NOT NULL,
  "created_at" text NOT NULL,
  CONSTRAINT "sumi_follows_follower_handle_followee_handle_pk" PRIMARY KEY("follower_handle","followee_handle")
);
`;

async function makeStore() {
  const client = new PGlite();
  await client.exec(DDL);
  const db = drizzle(client, { schema }) as unknown as PostgresJsDatabase<typeof schema>;
  return { store: new DbContentStore(db), db };
}

test("savePost + getPost + listPosts round-trip with tags/status/searchable body", async () => {
  const { store } = await makeStore();
  const slug = await store.savePost("alice", {
    title: "My First Post",
    body: "# Hi\n\nmirror notes",
    tags: ["intro", "db"],
    status: "published",
    publishedAt: "2026-06-12T00:00:00.000Z",
  });
  expect(slug).toBe("my-first-post");

  const post = await store.getPost("alice", "my-first-post");
  expect(post?.title).toBe("My First Post");
  expect(post?.tags).toEqual(["intro", "db"]);
  expect(post?.status).toBe("published");

  const all = await store.listPosts({ handle: "alice" });
  expect(all.map((p) => p.slug)).toEqual(["my-first-post"]);
  expect(all[0]).not.toHaveProperty("body");
});

test("agent flag round-trips through savePost/getPost/listPosts", async () => {
  const { store } = await makeStore();
  const slug = await store.savePost("agent-foo", {
    title: "Agent Post",
    body: "written by an agent",
    tags: ["ai"],
    status: "draft",
    agent: true,
  });
  expect(slug).toBe("agent-post");

  const post = await store.getPost("agent-foo", "agent-post");
  expect(post?.agent).toBe(true);

  const [meta] = await store.listPosts({ handle: "agent-foo" });
  expect(meta.agent).toBe(true);
});

test("searchPosts matches title/body/excerpt/tags, published only, newest first", async () => {
  const { store } = await makeStore();
  await store.savePost("alice", { title: "Postgres", body: "mirror notes", tags: ["db"], status: "published", publishedAt: "2026-06-10T00:00:00.000Z" });
  await store.savePost("alice", { title: "Cooking", body: "ramen recipe", excerpt: "noodles", tags: ["food"], status: "published", publishedAt: "2026-06-11T00:00:00.000Z" });
  await store.savePost("alice", { title: "Secret", body: "mirror mirror", tags: ["db"], status: "draft" });

  expect((await store.searchPosts("mirror")).map((r) => r.post.slug)).toEqual(["postgres"]);
  expect((await store.searchPosts("noodles")).map((r) => r.post.slug)).toEqual(["cooking"]);
  expect((await store.searchPosts("db")).map((r) => r.post.slug)).toEqual(["postgres"]);
  expect(await store.searchPosts("missing")).toEqual([]);
  expect(await store.searchPosts("   ")).toEqual([]);
});

test("comments list/add/nest round-trip", async () => {
  const { store } = await makeStore();
  expect(await store.listComments("alice", "hello")).toEqual([]);
  const root = await store.addComment("alice", "hello", { body: "root" }, "bob", new Date("2026-06-13T01:00:00Z"));
  const reply = await store.addComment("alice", "hello", { body: "reply", parentId: root.id }, "carol", new Date("2026-06-13T02:00:00Z"));
  const comments = await store.listComments("alice", "hello");
  expect(comments.map((c) => c.date)).toEqual([root.date, reply.date]);
  expect(comments.find((c) => c.id === root.id)?.parentId).toBeUndefined();
  expect(comments.find((c) => c.id === reply.id)?.parentId).toBe(root.id);
});

test("profile + magazine round-trip", async () => {
  const { store } = await makeStore();
  expect(await store.getProfile("alice")).toBeNull();
  await store.saveProfile("alice", { displayName: "Alice", bio: "hi" });
  expect(await store.getProfile("alice")).toEqual({ displayName: "Alice", bio: "hi" });

  const slug = await store.saveMagazine("alice", { title: "My Zine", description: "d", items: ["one", "two"] });
  expect(slug).toBe("my-zine");
  expect(await store.getMagazine("alice", "my-zine")).toEqual({
    slug: "my-zine",
    title: "My Zine",
    description: "d",
    items: ["one", "two"],
  });
  await store.deleteMagazine("alice", "my-zine");
  expect(await store.getMagazine("alice", "my-zine")).toBeNull();
});

test("listTags counts published posts only, newest-used sort, drafts excluded", async () => {
  const { store } = await makeStore();
  await store.savePost("alice", { title: "A", body: "a", tags: ["js", "web"], status: "published" });
  await store.savePost("alice", { title: "B", body: "b", tags: ["js"], status: "published" });
  await store.savePost("alice", { title: "C", body: "c", tags: ["js", "secret"], status: "draft" });
  const tags = await store.listTags();
  expect(tags).toEqual([
    { name: "js", count: 2 },
    { name: "web", count: 1 },
  ]);
});

test("uploadImage stores bytes in sumi_images and returns a serving path", async () => {
  const { store, db } = await makeStore();
  const path = await store.uploadImage("alice", "p", "cover.png", new Uint8Array([1, 2, 3]));
  expect(path).toMatch(/^\/api\/images\/[-\w]+$/);
  const id = path.split("/").pop()!;
  const rows = await db.select().from(sumiImages).where(eq(sumiImages.id, id)).limit(1);
  expect(rows).toHaveLength(1);
  expect(rows[0].mime).toBe("image/png");
  expect(rows[0].handle).toBe("alice");
  expect(Buffer.from(rows[0].bytes as Uint8Array)).toEqual(Buffer.from([1, 2, 3]));
});

test("deleteComment removes only the target comment, leaving siblings", async () => {
  const { store } = await makeStore();
  await store.savePost("alice", { title: "Hi", body: "x", status: "published" });
  const c1 = await store.addComment("alice", "hi", { body: "one" }, "bob", new Date("2026-06-01T00:00:00Z"));
  const c2 = await store.addComment("alice", "hi", { body: "two" }, "carol", new Date("2026-06-01T00:00:00Z"));
  await store.deleteComment("alice", "hi", c1.id);
  const left = await store.listComments("alice", "hi");
  expect(left.map((c) => c.id)).toEqual([c2.id]);
});

test("likes toggle, dedupe, and cascade on delete", async () => {
  const { store } = await makeStore();
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
  const { store } = await makeStore();
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