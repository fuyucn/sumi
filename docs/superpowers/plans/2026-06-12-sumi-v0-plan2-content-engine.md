# Sumi v0 — Plan 2: Content Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A tested content library that reads/writes posts (Markdown + frontmatter) and images to a GitHub repo via the GitHub API, behind a `ContentStore` interface decoupled from Octokit.

**Architecture:** Pure serialization/path helpers + a narrow `GitHubClient` interface (the subset of GitHub ops we use) implemented by an Octokit adapter. `GitHubContentStore` composes a `GitHubClient` to satisfy `ContentStore`. A factory builds a store for the current user using their stored GitHub OAuth token. Comments & magazines are deferred to Plan 4 — this plan covers posts + images.

**Tech Stack:** TypeScript · gray-matter (frontmatter) · @octokit/rest · Vitest. (Builds on Plan 1: Better Auth/Drizzle/Neon, `env.GITHUB_CONTENT_REPO`, the `account` table holding the GitHub access token.)

**Git policy:** commits LOCAL only — never push/remote. If signing errors, use `git -c commit.gpgsign=false commit ...`. NEVER run `git checkout/switch/reset` with a SHA in review subagents (detaches HEAD — caused lost work before); reviewers use only `git diff`/`git show`/`git log`/`git status`. Implementers confirm `git branch --show-current` == `plan2-content-engine` before committing.

---

## File Structure

- `src/content/types.ts` — `PostStatus`, `PostMeta`, `Post`, `NewPost`
- `src/content/frontmatter.ts` — `serializePost`, `parsePost` (Markdown ↔ {frontmatter, body})
- `src/content/paths.ts` — `slugify`, repo path builders
- `src/content/store.ts` — `ContentStore` interface
- `src/lib/github.ts` — `GitHubClient` interface + `octokitClient(token, repo)` adapter
- `src/content/github-token.ts` — `getGithubToken(userId)` from the `account` table
- `src/content/github-content-store.ts` — `GitHubContentStore` implements `ContentStore`
- `src/content/index.ts` — `getContentStoreForUser(userId)` factory
- Tests colocated as `src/**/*.test.ts`

---

## Task 1: Content types + frontmatter serialization

**Files:** Create `src/content/types.ts`, `src/content/frontmatter.ts`, `src/content/frontmatter.test.ts`

- [ ] **Step 1: Types** — `src/content/types.ts`:

```ts
export type PostStatus = "draft" | "published";

/** Metadata stored in an article's frontmatter (no body). */
export interface PostMeta {
  title: string;
  slug: string;
  tags: string[];
  excerpt?: string;
  coverImage?: string;
  status: PostStatus;
  publishedAt?: string; // ISO 8601, present once published
}

/** A full article: metadata + Markdown body. */
export interface Post extends PostMeta {
  body: string;
}

/** Input to create/update a post (slug derived if absent). */
export interface NewPost {
  title: string;
  body: string;
  tags?: string[];
  excerpt?: string;
  coverImage?: string;
  status?: PostStatus;
  publishedAt?: string;
}
```

- [ ] **Step 2: Failing test** — `src/content/frontmatter.test.ts`:

```ts
import { expect, test } from "vitest";
import { parsePost, serializePost } from "./frontmatter";
import type { Post } from "./types";

const post: Post = {
  title: "Hello",
  slug: "hello",
  tags: ["intro", "note"],
  excerpt: "hi there",
  status: "published",
  publishedAt: "2026-06-12T00:00:00.000Z",
  body: "# Hello\n\nThis is **markdown**.\n",
};

test("serialize then parse round-trips a post", () => {
  const md = serializePost(post);
  expect(md).toContain("---");
  expect(md).toContain("title: Hello");
  expect(md).toContain("# Hello");
  const parsed = parsePost(md, "hello");
  expect(parsed).toEqual(post);
});

test("parse fills defaults for missing optional frontmatter", () => {
  const md = "---\ntitle: Bare\nstatus: draft\n---\nbody text\n";
  const parsed = parsePost(md, "bare");
  expect(parsed.title).toBe("Bare");
  expect(parsed.slug).toBe("bare");
  expect(parsed.tags).toEqual([]);
  expect(parsed.status).toBe("draft");
  expect(parsed.body.trim()).toBe("body text");
});
```

- [ ] **Step 3: Run → FAIL** — `pnpm vitest run src/content/frontmatter.test.ts`

- [ ] **Step 4: Install + implement** — `pnpm add gray-matter`. Create `src/content/frontmatter.ts`:

```ts
import matter from "gray-matter";
import type { Post, PostMeta, PostStatus } from "./types";

/** Serialize a Post to a Markdown string with YAML frontmatter. */
export function serializePost(post: Post): string {
  const data: Record<string, unknown> = {
    title: post.title,
    tags: post.tags,
    status: post.status,
  };
  if (post.excerpt !== undefined) data.excerpt = post.excerpt;
  if (post.coverImage !== undefined) data.coverImage = post.coverImage;
  if (post.publishedAt !== undefined) data.publishedAt = post.publishedAt;
  // slug is the directory name, not stored in frontmatter.
  return matter.stringify(post.body, data);
}

/** Parse a Markdown string + known slug into a Post, filling defaults. */
export function parsePost(md: string, slug: string): Post {
  const { data, content } = matter(md);
  const status: PostStatus = data.status === "published" ? "published" : "draft";
  const meta: PostMeta = {
    title: typeof data.title === "string" ? data.title : "",
    slug,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status,
    ...(typeof data.excerpt === "string" ? { excerpt: data.excerpt } : {}),
    ...(typeof data.coverImage === "string" ? { coverImage: data.coverImage } : {}),
    ...(typeof data.publishedAt === "string" ? { publishedAt: data.publishedAt } : {}),
  };
  return { ...meta, body: content };
}
```

> NOTE: `matter.stringify` appends a trailing newline and orders keys as inserted. The round-trip test asserts `toEqual(post)`; if key ordering or the body's trailing newline causes a mismatch, adjust the test's expected `body` to match gray-matter's normalization (it preserves body content; it may trim/add a leading newline). Make the test reflect real library behavior rather than forcing the impl. Keep `slug` OUT of frontmatter (it's the dir name).

- [ ] **Step 5: Run → PASS**; then `pnpm test` + `pnpm typecheck` + `pnpm lint` green.

- [ ] **Step 6: Commit** — confirm branch, `git add -A && git commit -m "feat: content types + frontmatter serialization"`

---

## Task 2: Path + slug helpers

**Files:** Create `src/content/paths.ts`, `src/content/paths.test.ts`

- [ ] **Step 1: Failing test** — `src/content/paths.test.ts`:

```ts
import { expect, test } from "vitest";
import { slugify, postDir, postFile, imagePath, userDir, CONTENT_DIR } from "./paths";

test("slugify lowercases, trims, replaces spaces and strips punctuation", () => {
  expect(slugify("Hello World!")).toBe("hello-world");
  expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  expect(slugify("Café & Crème")).toBe("cafe-creme");
});

test("slugify keeps unicode letters (e.g. Japanese)", () => {
  expect(slugify("こんにちは 世界")).toBe("こんにちは-世界");
});

test("slugify falls back to 'post' for empty result", () => {
  expect(slugify("!!!")).toBe("post");
});

test("path builders compose the content layout", () => {
  expect(CONTENT_DIR).toBe("content");
  expect(userDir("alice")).toBe("content/@alice");
  expect(postDir("alice", "hello")).toBe("content/@alice/hello");
  expect(postFile("alice", "hello")).toBe("content/@alice/hello/index.md");
  expect(imagePath("alice", "hello", "cover.png")).toBe("content/@alice/hello/images/cover.png");
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — `src/content/paths.ts`:

```ts
export const CONTENT_DIR = "content";

/** URL/path-safe slug. Keeps unicode letters/numbers, normalizes accents on ASCII. */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-") // non-letter/number runs -> hyphen
    .replace(/^-+|-+$/g, ""); // trim hyphens
  return slug || "post";
}

export function userDir(handle: string): string {
  return `${CONTENT_DIR}/@${handle}`;
}
export function postDir(handle: string, slug: string): string {
  return `${userDir(handle)}/${slug}`;
}
export function postFile(handle: string, slug: string): string {
  return `${postDir(handle, slug)}/index.md`;
}
export function imagePath(handle: string, slug: string, filename: string): string {
  return `${postDir(handle, slug)}/images/${filename}`;
}
```

> NOTE: verify the unicode test outcome against the actual regex behavior. `\p{L}` keeps Japanese; the space between こんにちは and 世界 becomes a hyphen. If `normalize("NFKD")` decomposes Japanese unexpectedly, adjust — the intent: ASCII accents flattened (café→cafe), CJK preserved, separators→single hyphen. Tune the test to real output if a specific char differs, keeping the documented intent.

- [ ] **Step 4: Run → PASS**; `pnpm test` + `typecheck` + `lint` green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: content path and slug helpers"`

---

## Task 3: ContentStore interface

**Files:** Create `src/content/store.ts`

- [ ] **Step 1: Define the interface** — `src/content/store.ts`:

```ts
import type { Post, PostMeta, NewPost } from "./types";

export interface ListPostsOptions {
  handle?: string; // restrict to one creator
  status?: "draft" | "published"; // filter by status
}

/**
 * Read/write content. v0 implementation is GitHub-backed (GitHubContentStore);
 * the interface is the seam that lets a future DbContentStore drop in.
 */
export interface ContentStore {
  listPosts(opts?: ListPostsOptions): Promise<PostMeta[]>;
  getPost(handle: string, slug: string): Promise<Post | null>;
  /** Create or overwrite a post. Returns the resolved slug. */
  savePost(handle: string, post: NewPost): Promise<string>;
  deletePost(handle: string, slug: string): Promise<void>;
  /** Upload an image into a post's images/ dir. Returns the in-post relative path (e.g. "images/x.png"). */
  uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string>;
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck` clean.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: ContentStore interface"`

---

## Task 4: GitHubClient interface + Octokit adapter

**Files:** Create `src/lib/github.ts`, `src/lib/github.test.ts`

- [ ] **Step 1: Install** — `pnpm add @octokit/rest`

- [ ] **Step 2: Failing test** (the adapter maps our narrow interface onto Octokit; test it against a fake Octokit-shaped object to assert correct calls + decoding). `src/lib/github.test.ts`:

```ts
import { expect, test, vi } from "vitest";
import { makeGitHubClient } from "./github";

function fakeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    repos: {
      getContent: vi.fn(),
      createOrUpdateFileContents: vi.fn().mockResolvedValue({}),
      deleteFile: vi.fn().mockResolvedValue({}),
      ...overrides,
    },
  };
}

test("getFile decodes base64 content and returns sha; null on 404", async () => {
  const okt = fakeOctokit({
    getContent: vi
      .fn()
      .mockResolvedValueOnce({
        data: { type: "file", content: Buffer.from("hello", "utf8").toString("base64"), sha: "abc" },
      })
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { status: 404 })),
  });
  const client = makeGitHubClient(okt as never, "alice/repo");
  const f = await client.getFile("content/x.md");
  expect(f).toEqual({ content: "hello", sha: "abc" });
  const missing = await client.getFile("content/none.md");
  expect(missing).toBeNull();
});

test("putTextFile base64-encodes and forwards sha for updates", async () => {
  const okt = fakeOctokit();
  const client = makeGitHubClient(okt as never, "alice/repo");
  await client.putTextFile("content/x.md", "body", "msg", "oldsha");
  expect(okt.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
    expect.objectContaining({
      owner: "alice",
      repo: "repo",
      path: "content/x.md",
      message: "msg",
      content: Buffer.from("body", "utf8").toString("base64"),
      sha: "oldsha",
    }),
  );
});
```

- [ ] **Step 3: Run → FAIL**

- [ ] **Step 4: Implement** — `src/lib/github.ts`:

```ts
import { Octokit } from "@octokit/rest";

export interface RepoFile {
  content: string; // UTF-8 decoded
  sha: string;
}
export interface DirEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface GitHubClient {
  getFile(path: string): Promise<RepoFile | null>;
  listDir(path: string): Promise<DirEntry[]>;
  putTextFile(path: string, text: string, message: string, sha?: string): Promise<void>;
  putBinaryFile(path: string, bytes: Uint8Array, message: string, sha?: string): Promise<void>;
  deleteFile(path: string, message: string, sha: string): Promise<void>;
}

function splitRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

function isStatus(err: unknown, code: number): boolean {
  return typeof err === "object" && err !== null && (err as { status?: number }).status === code;
}

/** Adapt an Octokit instance to the narrow GitHubClient interface. */
export function makeGitHubClient(octokit: Octokit, repo: string): GitHubClient {
  const { owner, repo: name } = splitRepo(repo);

  return {
    async getFile(path) {
      try {
        const res = await octokit.repos.getContent({ owner, repo: name, path });
        const data = res.data as { type?: string; content?: string; sha: string };
        if (data.type !== "file" || typeof data.content !== "string") return null;
        return {
          content: Buffer.from(data.content, "base64").toString("utf8"),
          sha: data.sha,
        };
      } catch (err) {
        if (isStatus(err, 404)) return null;
        throw err;
      }
    },
    async listDir(path) {
      try {
        const res = await octokit.repos.getContent({ owner, repo: name, path });
        if (!Array.isArray(res.data)) return [];
        return res.data.map((e) => ({ name: e.name, path: e.path, type: e.type === "dir" ? "dir" : "file" }));
      } catch (err) {
        if (isStatus(err, 404)) return [];
        throw err;
      }
    },
    async putTextFile(path, text, message, sha) {
      await octokit.repos.createOrUpdateFileContents({
        owner, repo: name, path, message,
        content: Buffer.from(text, "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
      });
    },
    async putBinaryFile(path, bytes, message, sha) {
      await octokit.repos.createOrUpdateFileContents({
        owner, repo: name, path, message,
        content: Buffer.from(bytes).toString("base64"),
        ...(sha ? { sha } : {}),
      });
    },
    async deleteFile(path, message, sha) {
      await octokit.repos.deleteFile({ owner, repo: name, path, message, sha });
    },
  };
}

/** Build a GitHubClient from an OAuth token + "owner/repo". */
export function githubClientFromToken(token: string, repo: string): GitHubClient {
  return makeGitHubClient(new Octokit({ auth: token }), repo);
}
```

> NOTE: verify `@octokit/rest`'s `repos.getContent`/`createOrUpdateFileContents`/`deleteFile` signatures against the installed version. The fake in the test only needs the methods we call; if the installed Octokit's response shape differs, adapt the decoding and keep the test asserting real behavior.

- [ ] **Step 5: Run → PASS**; `pnpm test` + `typecheck` + `lint` green.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: GitHubClient interface + Octokit adapter"`

---

## Task 5: GitHub token retrieval from the account table

**Files:** Create `src/content/github-token.ts`, `src/content/github-token.test.ts`

- [ ] **Step 1: Failing test** (inject a fake Drizzle-shaped db so no real DB needed). `src/content/github-token.test.ts`:

```ts
import { expect, test } from "vitest";
import { getGithubToken } from "./github-token";

function fakeDb(rows: Array<{ accessToken: string | null }>) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  } as never;
}

test("returns the github access token for a user", async () => {
  const token = await getGithubToken("user-1", fakeDb([{ accessToken: "gho_xxx" }]));
  expect(token).toBe("gho_xxx");
});

test("returns null when no github account row exists", async () => {
  const token = await getGithubToken("user-1", fakeDb([]));
  expect(token).toBeNull();
});

test("returns null when the token column is null", async () => {
  const token = await getGithubToken("user-1", fakeDb([{ accessToken: null }]));
  expect(token).toBeNull();
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — `src/content/github-token.ts`:

```ts
import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { account } from "@/db/schema";

type Db = Pick<typeof defaultDb, "select">;

/** Fetch the stored GitHub OAuth access token for a user, or null. */
export async function getGithubToken(userId: string, db: Db = defaultDb): Promise<string | null> {
  const rows = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .limit(1);
  return rows[0]?.accessToken ?? null;
}
```

> NOTE: confirm `drizzle-orm` exports `and`/`eq` and that the fake db's chained shape matches how the real query resolves (the chain `.select().from().where().limit()` must return a promise resolving to rows). If the real Drizzle chain differs (e.g. it's a thenable not requiring `.limit` to be async), adjust the fake to mirror real Drizzle so the test is honest. The default `db` is the lazy proxy from Plan 1; the injectable `db` param keeps this unit-testable.

- [ ] **Step 4: Run → PASS**; full suite + typecheck + lint green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: getGithubToken from account table"`

---

## Task 6: GitHubContentStore

**Files:** Create `src/content/github-content-store.ts`, `src/content/github-content-store.test.ts`

- [ ] **Step 1: Failing test** (drive the store with an in-memory fake GitHubClient). `src/content/github-content-store.test.ts`:

```ts
import { expect, test } from "vitest";
import type { GitHubClient, RepoFile, DirEntry } from "@/lib/github";
import { GitHubContentStore } from "./github-content-store";

/** In-memory fake of the repo filesystem. */
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
    async putTextFile(path, text) {
      files.set(path, text);
    },
    async putBinaryFile(path) {
      files.set(path, "<binary>");
    },
    async deleteFile(path) {
      files.delete(path);
    },
  };
}

test("savePost writes index.md and getPost reads it back", async () => {
  const store = new GitHubContentStore(fakeClient());
  const slug = await store.savePost("alice", {
    title: "My First Post",
    body: "# Hi\n\nhello",
    tags: ["intro"],
    status: "published",
    publishedAt: "2026-06-12T00:00:00.000Z",
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

test("listPosts returns metadata for a creator", async () => {
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
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — `src/content/github-content-store.ts`:

```ts
import type { GitHubClient } from "@/lib/github";
import type { ContentStore, ListPostsOptions } from "./store";
import type { NewPost, Post, PostMeta } from "./types";
import { parsePost, serializePost } from "./frontmatter";
import { imagePath, postDir, postFile, slugify, userDir } from "./paths";

export class GitHubContentStore implements ContentStore {
  constructor(private readonly client: GitHubClient) {}

  async getPost(handle: string, slug: string): Promise<Post | null> {
    const file = await this.client.getFile(postFile(handle, slug));
    if (!file) return null;
    return parsePost(file.content, slug);
  }

  async savePost(handle: string, post: NewPost): Promise<string> {
    const slug = slugify(post.title);
    const full: Post = {
      title: post.title,
      slug,
      tags: post.tags ?? [],
      status: post.status ?? "draft",
      body: post.body,
      ...(post.excerpt !== undefined ? { excerpt: post.excerpt } : {}),
      ...(post.coverImage !== undefined ? { coverImage: post.coverImage } : {}),
      ...(post.publishedAt !== undefined ? { publishedAt: post.publishedAt } : {}),
    };
    const path = postFile(handle, slug);
    const existing = await this.client.getFile(path);
    await this.client.putTextFile(path, serializePost(full), `Save post: @${handle}/${slug}`, existing?.sha);
    return slug;
  }

  async deletePost(handle: string, slug: string): Promise<void> {
    const dir = postDir(handle, slug);
    await this.deleteTree(dir);
  }

  async listPosts(opts: ListPostsOptions = {}): Promise<PostMeta[]> {
    const handles = opts.handle ? [opts.handle] : await this.listHandles();
    const out: PostMeta[] = [];
    for (const handle of handles) {
      const entries = await this.client.listDir(userDir(handle));
      for (const entry of entries) {
        if (entry.type !== "dir") continue;
        const post = await this.getPost(handle, entry.name);
        if (!post) continue;
        if (opts.status && post.status !== opts.status) continue;
        const { body: _body, ...meta } = post;
        out.push(meta);
      }
    }
    return out;
  }

  async uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string> {
    const path = imagePath(handle, slug, filename);
    const existing = await this.client.getFile(path);
    await this.client.putBinaryFile(path, bytes, `Upload image: ${filename}`, existing?.sha);
    return `images/${filename}`;
  }

  private async listHandles(): Promise<string[]> {
    const entries = await this.client.listDir("content");
    return entries
      .filter((e) => e.type === "dir" && e.name.startsWith("@"))
      .map((e) => e.name.slice(1));
  }

  /** Recursively delete a directory's files via the contents API. */
  private async deleteTree(dir: string): Promise<void> {
    const entries = await this.client.listDir(dir);
    for (const entry of entries) {
      if (entry.type === "dir") {
        await this.deleteTree(entry.path);
      } else {
        const file = await this.client.getFile(entry.path);
        if (file) await this.client.deleteFile(entry.path, `Delete ${entry.path}`, file.sha);
      }
    }
  }
}
```

> NOTE: the fake client's `listDir` returns the post dir's children (e.g. `index.md`, `images`); `deleteTree` recurses. Confirm the fake + impl agree on the path scheme. `savePost` derives slug from title via `slugify` — if a future need arises for explicit slugs or rename, that's a later extension (YAGNI now).

- [ ] **Step 4: Run → PASS**; full suite + typecheck + lint green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: GitHubContentStore over GitHubClient"`

---

## Task 7: Factory — getContentStoreForUser

**Files:** Create `src/content/index.ts`, `src/content/index.test.ts`

- [ ] **Step 1: Failing test** — `src/content/index.test.ts`:

```ts
import { expect, test } from "vitest";
import { GitHubContentStore } from "./github-content-store";
import { buildContentStore } from "./index";

test("buildContentStore returns a GitHubContentStore for a token+repo", () => {
  const store = buildContentStore("gho_token", "alice/sumi-content");
  expect(store).toBeInstanceOf(GitHubContentStore);
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — `src/content/index.ts`:

```ts
import { githubClientFromToken } from "@/lib/github";
import { env } from "@/lib/env";
import { getGithubToken } from "./github-token";
import { GitHubContentStore } from "./github-content-store";
import type { ContentStore } from "./store";

export type { ContentStore } from "./store";
export { GitHubContentStore } from "./github-content-store";

/** Build a content store from an explicit token + repo (testable, no I/O). */
export function buildContentStore(token: string, repo: string): ContentStore {
  return new GitHubContentStore(githubClientFromToken(token, repo));
}

/**
 * Build the content store for a signed-in user, using their stored GitHub token
 * and the configured content repo. Returns null if no token or repo is configured.
 */
export async function getContentStoreForUser(userId: string): Promise<ContentStore | null> {
  const token = await getGithubToken(userId);
  const repo = env.GITHUB_CONTENT_REPO;
  if (!token || !repo) return null;
  return buildContentStore(token, repo);
}
```

- [ ] **Step 4: Run → PASS**; full suite + `pnpm typecheck` + `pnpm lint` + `pnpm build` green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: content store factory (getContentStoreForUser)"`

---

## Done criteria for Plan 2

- `pnpm test`/`typecheck`/`lint`/`build` all pass.
- A `ContentStore` interface exists with a `GitHubContentStore` implementation that round-trips posts (Markdown+frontmatter) and uploads images, all decoupled from Octokit via `GitHubClient` and fully unit-tested with fakes (no live GitHub).
- `getContentStoreForUser(userId)` builds a store from the user's stored GitHub token + `GITHUB_CONTENT_REPO`.

Writing/reading UI (editor, article pages) is Plan 3 and consumes this engine.
```
