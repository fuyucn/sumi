# Sumi v0 — Plan 3: Reading Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Public, SSR reading pages — home feed, creator page, article page, tag page — rendering published posts from the GitHub content repo, with Markdown→HTML rendering.

**Architecture:** Public pages read content WITHOUT a signed-in user's token, via a read-side store `getReadContentStore()` that uses an optional server `GITHUB_CONTENT_TOKEN` (falls back to unauthenticated Octokit for public repos). Markdown bodies render via react-markdown. Pages are dynamic (data fetched per request). Writing (editor + server actions) is a later plan; this plan is read-only.

**Tech Stack:** Next.js 16 (App Router, RSC) · react-markdown + remark-gfm · the Plan 2 content engine · Vitest.

**Git policy:** commits LOCAL only — never push/remote. NEVER `git checkout/switch/reset` with a SHA in review subagents (detaches HEAD — caused lost work before); reviewers use only `git diff`/`git show`/`git log`/`git status`. Implementers confirm `git branch --show-current` == `plan3-reading` before committing; if signing errors use `git -c commit.gpgsign=false commit ...`.

**Next.js 16 routing note (important):** A folder literally named `@handle` is the App Router *parallel-route* convention, so we CANNOT create `src/app/@handle/`. Instead use a dynamic segment `src/app/[handle]/` — the URL `/@alice` matches it with `params.handle === "@alice"`; strip the leading `@` and 404 if absent. Static routes (`/tag`, `/sign-in`, `/write`, `/api`) take precedence over `[handle]`, so they're unaffected. Verify this precedence against the installed Next 16 (`node_modules/next/dist/docs/`) before building the routes.

---

## File Structure

- `src/lib/env.ts` — add optional `GITHUB_CONTENT_TOKEN`
- `src/lib/github.ts` — add `readGitHubClient(repo, token?)` (auth optional)
- `src/content/index.ts` — add `getReadContentStore()`
- `src/lib/user.ts` — `getUserHandle(userId, db?)` (reads `user.username`)
- `src/components/markdown.tsx` — `<Markdown>` renderer
- `src/components/post-card.tsx` — small post-summary component (DRY across feeds)
- `src/app/page.tsx` — home: latest published feed
- `src/app/[handle]/page.tsx` — creator page
- `src/app/[handle]/[slug]/page.tsx` — article page
- `src/app/tag/[slug]/page.tsx` — tag page
- Tests colocated as `src/**/*.test.ts(x)`

---

## Task 1: Read-side content access + handle lookup

**Files:** modify `src/lib/env.ts`, `src/lib/github.ts`, `src/content/index.ts`; create `src/lib/user.ts`, `src/lib/user.test.ts`, `src/content/read-store.test.ts`

- [ ] **Step 1: env** — in `src/lib/env.ts` add to the schema (after `GITHUB_CONTENT_REPO`):
```ts
  // Optional read token for server-side public reads of the content repo.
  // If absent, reads use unauthenticated Octokit (works for public repos).
  GITHUB_CONTENT_TOKEN: z.string().optional(),
```

- [ ] **Step 2: read client** — in `src/lib/github.ts` add:
```ts
/** A GitHubClient for reads. Uses the token if provided, else unauthenticated (public repos). */
export function readGitHubClient(repo: string, token?: string): GitHubClient {
  return makeGitHubClient(new Octokit(token ? { auth: token } : {}), repo);
}
```

- [ ] **Step 3: read store** — in `src/content/index.ts` add (import `readGitHubClient`):
```ts
import { githubClientFromToken, readGitHubClient } from "@/lib/github";
// ...existing...

/** A content store for PUBLIC reads (no signed-in user needed). Null if no repo configured. */
export function getReadContentStore(): ContentStore | null {
  const repo = env.GITHUB_CONTENT_REPO;
  if (!repo) return null;
  return new GitHubContentStore(readGitHubClient(repo, env.GITHUB_CONTENT_TOKEN));
}
```

- [ ] **Step 4: handle lookup test** — `src/lib/user.test.ts` (inject fake db like getGithubToken):
```ts
import { expect, test } from "vitest";
import { getUserHandle } from "./user";

function fakeDb(rows: Array<{ username: string | null }>) {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }),
  } as never;
}

test("returns the username (handle) for a user", async () => {
  expect(await getUserHandle("u1", fakeDb([{ username: "alice" }]))).toBe("alice");
});
test("returns null when user has no username", async () => {
  expect(await getUserHandle("u1", fakeDb([{ username: null }]))).toBeNull();
});
test("returns null when no row", async () => {
  expect(await getUserHandle("u1", fakeDb([]))).toBeNull();
});
```

- [ ] **Step 5: handle lookup impl** — `src/lib/user.ts`:
```ts
import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { user } from "@/db/schema";

type Db = {
  select(fields: Record<string, unknown>): {
    from(table: unknown): { where(cond: unknown): { limit(n: number): Promise<Array<{ username: string | null }>> } };
  };
};

/** The GitHub handle (username) for a user id, or null. */
export async function getUserHandle(userId: string, db: Db = defaultDb as unknown as Db): Promise<string | null> {
  const rows = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1);
  return rows[0]?.username ?? null;
}
```
(Mirror the `Db` cast pattern used in `src/content/github-token.ts`.)

- [ ] **Step 6: read-store smoke test** — `src/content/read-store.test.ts`:
```ts
import { expect, test } from "vitest";
import { GitHubContentStore } from "./github-content-store";
import { getReadContentStore } from "./index";

// vitest env sets GITHUB_CONTENT_REPO, so a store is returned.
test("getReadContentStore builds a store when a content repo is configured", () => {
  expect(getReadContentStore()).toBeInstanceOf(GitHubContentStore);
});
```

- [ ] **Step 7: Verify** — `pnpm test` + `typecheck` + `lint` green.

- [ ] **Step 8: Commit** — confirm branch, `git add -A && git commit -m "feat: read-side content store + getUserHandle"`

---

## Task 2: Markdown renderer

**Files:** create `src/components/markdown.tsx`, `src/components/markdown.test.tsx`

- [ ] **Step 1: Install** — `pnpm add react-markdown remark-gfm`

- [ ] **Step 2: Failing test** — `src/components/markdown.test.tsx`:
```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Markdown } from "./markdown";

test("renders markdown headings and bold to HTML", () => {
  const html = renderToStaticMarkup(<Markdown>{"# Title\n\nsome **bold** text"}</Markdown>);
  expect(html).toContain("<h1>Title</h1>");
  expect(html).toContain("<strong>bold</strong>");
});

test("renders GFM tables", () => {
  const html = renderToStaticMarkup(<Markdown>{"| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>);
  expect(html).toContain("<table>");
});

test("does not render raw HTML (XSS safety)", () => {
  const html = renderToStaticMarkup(<Markdown>{"<script>alert(1)</script>"}</Markdown>);
  expect(html).not.toContain("<script>");
});
```

- [ ] **Step 3: Run → FAIL**

- [ ] **Step 4: Implement** — `src/components/markdown.tsx`:
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders a Markdown string to sanitized HTML (no raw HTML passthrough). */
export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}
```
> NOTE: react-markdown does NOT render raw HTML unless `rehype-raw` is added, so the XSS test passes by default. Verify the installed react-markdown major version's API (`remarkPlugins` prop, children-as-string) — adapt if it changed. If `renderToStaticMarkup` has trouble with react-markdown's ESM in the vitest node env, confirm vitest is configured for ESM (it is via Vite) — should work; if not, report.

- [ ] **Step 5: Run → PASS**; `pnpm test` + `typecheck` + `lint` green.

- [ ] **Step 6: Commit** — confirm branch, `git add -A && git commit -m "feat: Markdown renderer component"`

---

## Task 3: Post-card component + home feed

**Files:** create `src/components/post-card.tsx`; modify `src/app/page.tsx`

- [ ] **Step 1: Post-card** — `src/components/post-card.tsx` (presentational, takes a PostMeta + handle):
```tsx
import Link from "next/link";
import type { PostMeta } from "@/content/types";

export function PostCard({ handle, post }: { handle: string; post: PostMeta }) {
  return (
    <article style={{ borderBottom: "1px solid #eee", padding: "1rem 0" }}>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
        <Link href={`/@${handle}/${post.slug}`}>{post.title}</Link>
      </h2>
      <p style={{ color: "#666", margin: "0.25rem 0" }}>
        <Link href={`/@${handle}`}>@{handle}</Link>
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>
      {post.excerpt ? <p style={{ margin: 0 }}>{post.excerpt}</p> : null}
      {post.tags.length > 0 ? (
        <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
          {post.tags.map((t) => (
            <Link key={t} href={`/tag/${t}`} style={{ marginRight: 8 }}>#{t}</Link>
          ))}
        </p>
      ) : null}
    </article>
  );
}
```
> NOTE: `PostMeta` has no `handle` field, so the feed must pair each post with its author handle. `listPosts()` returns only PostMeta. For the home feed we need the author handle per post — since the content layout is `content/@handle/<slug>`, extend the read path: see Step 2. (For v0, the home feed derives handle from the listing; if `listPosts` doesn't return handle, Task 3 Step 2 adds a small `listPostsWithHandles` helper on the read path OR the page lists per-handle. Simplest: add a `handle` to the returned items at the page layer — see Step 2.)

- [ ] **Step 2: Home page** — replace `src/app/page.tsx`. Because `listPosts()` returns `PostMeta` without the author handle, and the home feed needs it, add a tiny module `src/content/feed.ts` with `listFeed()` returning `{ handle, post }[]`:

Create `src/content/feed.ts`:
```ts
import { getReadContentStore } from "./index";
import type { PostMeta } from "./types";

export interface FeedItem {
  handle: string;
  post: PostMeta;
}

/**
 * Published posts across all creators, newest first. Returns [] if no store/repo.
 * Derives each post's handle by listing per-creator (the content layout is content/@handle/<slug>).
 */
export async function listFeed(): Promise<FeedItem[]> {
  const store = getReadContentStore();
  if (!store) return [];
  // GitHubContentStore.listPosts() with no handle scans all creators but loses handle;
  // instead enumerate handles, then list each creator's published posts.
  const items: FeedItem[] = [];
  for (const handle of await listHandles(store)) {
    const posts = await store.listPosts({ handle, status: "published" });
    for (const post of posts) items.push({ handle, post });
  }
  items.sort((a, b) => (b.post.publishedAt ?? "").localeCompare(a.post.publishedAt ?? ""));
  return items;
}

// listHandles is not on the ContentStore interface; expose a helper via a published-posts scan.
async function listHandles(store: ReturnType<typeof getReadContentStore>): Promise<string[]> {
  // Minimal approach for v0: ContentStore has no listHandles; add one. See note.
  return store ? store.listHandles() : [];
}
```
> DESIGN DECISION (resolve in this task): `ContentStore.listPosts()` intentionally returns `PostMeta` without handle, and there's no public `listHandles`. To build a cross-creator feed cleanly, ADD `listHandles(): Promise<string[]>` to the `ContentStore` interface and implement it in `GitHubContentStore` (it already has a private `listHandles` — make it public), plus add a unit test for it in `github-content-store.test.ts`. Then `feed.ts` uses `store.listHandles()`. This is the clean fix rather than the placeholder above. Implement it that way; update the fake client test if needed. Keep all existing tests green.

Then `src/app/page.tsx`:
```tsx
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, feed] = await Promise.all([getCurrentUser(), listFeed()]);
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Sumi 墨</h1>
        <span>{user ? `@${(user as { username?: string }).username ?? user.name}` : <Link href="/sign-in">Sign in</Link>}</span>
      </header>
      {feed.length === 0 ? (
        <p style={{ color: "#666" }}>No published posts yet.</p>
      ) : (
        feed.map(({ handle, post }) => <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />)
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify** — `pnpm test` (incl. new listHandles test) + `typecheck` + `lint` + `pnpm build` (home builds as dynamic). Green.

- [ ] **Step 4: Commit** — confirm branch, `git add -A && git commit -m "feat: home feed + post card + ContentStore.listHandles"`

---

## Task 4: Creator page + article page

**Files:** create `src/app/[handle]/page.tsx`, `src/app/[handle]/[slug]/page.tsx`

> Next 16: `params` is a Promise in async server components — `const { handle } = await params`. Verify against installed Next docs. URL `/@alice` → `params.handle === "@alice"`; strip leading `@`, else `notFound()`.

- [ ] **Step 1: Creator page** — `src/app/[handle]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  if (!raw.startsWith("@")) notFound();
  const handle = raw.slice(1);
  const store = getReadContentStore();
  if (!store) notFound();
  const posts = await store.listPosts({ handle, status: "published" });
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>@{handle}</h1>
      {posts.length === 0 ? <p style={{ color: "#666" }}>No posts yet.</p> : posts.map((post) => <PostCard key={post.slug} handle={handle} post={post} />)}
    </main>
  );
}
```
> `getReadContentStore` is exported from `src/content/index.ts`; ensure `@/content` resolves to `src/content/index.ts` (it does via the package's index). If the import path `@/content` doesn't resolve, use `@/content/index`.

- [ ] **Step 2: Article page** — `src/app/[handle]/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReadContentStore } from "@/content";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

async function load(handleRaw: string, slug: string) {
  if (!handleRaw.startsWith("@")) return null;
  const store = getReadContentStore();
  if (!store) return null;
  const handle = handleRaw.slice(1);
  const post = await store.getPost(handle, slug);
  if (!post || post.status !== "published") return null;
  return { handle, post };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; slug: string }> }): Promise<Metadata> {
  const { handle, slug } = await params;
  const data = await load(handle, slug);
  if (!data) return {};
  return { title: data.post.title, description: data.post.excerpt };
}

export default async function ArticlePage({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const data = await load(handle, slug);
  if (!data) notFound();
  const { post } = data;
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#666" }}>
        <a href={`/@${data.handle}`}>@{data.handle}</a>
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>
      <Markdown>{post.body}</Markdown>
    </main>
  );
}
```

- [ ] **Step 3: Verify** — `pnpm typecheck` + `lint` + `pnpm build` succeed; confirm `/[handle]` and `/[handle]/[slug]` appear as dynamic routes. `pnpm test` still green.

- [ ] **Step 4: Commit** — confirm branch, `git add -A && git commit -m "feat: creator and article reading pages"`

---

## Task 5: Tag page

**Files:** create `src/app/tag/[slug]/page.tsx`

- [ ] **Step 1: Implement** — `src/app/tag/[slug]/page.tsx` (reuse the feed, filter by tag):
```tsx
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = decodeURIComponent(slug);
  const feed = await listFeed();
  const matches = feed.filter(({ post }) => post.tags.includes(tag));
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>#{tag}</h1>
      {matches.length === 0 ? <p style={{ color: "#666" }}>No posts tagged #{tag}.</p> : matches.map(({ handle, post }) => <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />)}
    </main>
  );
}
```

- [ ] **Step 2: Verify** — full `pnpm test` + `typecheck` + `lint` + `pnpm build` all green; `/tag/[slug]` is a dynamic route.

- [ ] **Step 3: Commit** — confirm branch, `git add -A && git commit -m "feat: tag page"`

---

## Done criteria for Plan 3

- `pnpm test`/`typecheck`/`lint`/`build` all pass.
- `getReadContentStore()` reads the content repo without a signed-in user (optional `GITHUB_CONTENT_TOKEN`).
- `ContentStore.listHandles()` exists and is tested.
- Home (latest published feed), creator `/@handle`, article `/@handle/<slug>` (published-only, with SEO metadata), and tag `/tag/<slug>` pages render via SSR.
- Markdown renders to safe HTML (no raw-HTML XSS), with GFM.

Writing (TipTap editor + server actions to create/publish posts) is the next plan; this plan is read-only. Manual end-to-end verification of the pages requires a content repo with at least one published post (and `GITHUB_CONTENT_REPO`/token configured).
```
