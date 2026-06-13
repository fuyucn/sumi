# Sumi v0 — Plan 4: Writing UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a signed-in, allowlisted user compose, save (draft), publish, edit, and delete posts in the browser — committing Markdown to their GitHub content repo.

**Architecture:** A pure form→`NewPost` builder (zod) and a dependency-injected orchestration core (`runSavePost`/`runDeletePost`) are unit-tested with fakes. Thin `"use server"` actions resolve auth/handle/store and delegate to the core. A TipTap editor (client) serializes to Markdown. `/write` (new) and `/write/[slug]` (edit) are auth-gated.

**Tech Stack:** Next.js 16 (App Router, Server Actions) · @tiptap/react + starter-kit + tiptap-markdown · zod · the Plan 2 content engine + Plan 3 read store · Vitest.

**Git policy:** commits LOCAL only — never push/remote. NEVER `git checkout/switch/reset` with a SHA in review subagents (detaches HEAD — caused lost work before); reviewers use only `git diff`/`git show`/`git log`/`git status`. Implementers confirm `git branch --show-current` == `plan4-writing` before committing; signing errors → `git -c commit.gpgsign=false commit ...`.

**Testing reality:** the TipTap editor and the live save (which commits to GitHub) can only be fully verified in a browser with real credentials. This plan unit-tests the pure builder + the injected orchestration core, and relies on build/typecheck for the editor + pages. End-to-end is a manual post-deploy step.

---

## File Structure
- `src/content/post-input.ts` — `writeFormSchema`, `buildNewPost(form, now)` (pure)
- `src/app/write/actions.ts` — `"use server"` actions + injected core `runSavePost`/`runDeletePost`
- `src/app/write/actions-core.ts` — pure orchestration (injected deps) — testable without Next
- `src/components/editor.tsx` — TipTap client editor (Markdown in/out)
- `src/components/post-form.tsx` — client form wrapping the editor + title/tags/publish + calls the action
- `src/app/write/page.tsx` — new-post page (auth-gated)
- `src/app/write/[slug]/page.tsx` — edit page (loads post, auth-gated)
- `src/app/page.tsx` — add a "Write" link for signed-in users
- Tests colocated.

---

## Task 1: Post-input builder (pure)

**Files:** create `src/content/post-input.ts`, `src/content/post-input.test.ts`

- [ ] **Step 1: Failing test** — `src/content/post-input.test.ts`:
```ts
import { expect, test } from "vitest";
import { buildNewPost } from "./post-input";

const now = new Date("2026-06-13T12:00:00.000Z");

test("draft: status draft, no publishedAt, tags parsed", () => {
  const p = buildNewPost({ title: "Hi", body: "x", tags: "a, b ,c", publish: false }, now);
  expect(p.status).toBe("draft");
  expect(p.publishedAt).toBeUndefined();
  expect(p.tags).toEqual(["a", "b", "c"]);
  expect(p.title).toBe("Hi");
  expect(p.body).toBe("x");
});

test("publish: status published, publishedAt = now ISO", () => {
  const p = buildNewPost({ title: "Hi", body: "x", tags: "", publish: true }, now);
  expect(p.status).toBe("published");
  expect(p.publishedAt).toBe("2026-06-13T12:00:00.000Z");
  expect(p.tags).toEqual([]);
});

test("empty title throws", () => {
  expect(() => buildNewPost({ title: "  ", body: "x", tags: "", publish: false }, now)).toThrow();
});

test("missing fields use defaults (tags '', publish false)", () => {
  const p = buildNewPost({ title: "T", body: "" }, now);
  expect(p.status).toBe("draft");
  expect(p.tags).toEqual([]);
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — `src/content/post-input.ts`:
```ts
import { z } from "zod";
import type { NewPost } from "./types";

export const writeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().default(""),
  tags: z.string().default(""), // comma-separated
  publish: z.boolean().default(false),
});

export type WriteForm = z.input<typeof writeFormSchema>;

/** Validate a write form and build a NewPost. `now` is injected for testability. */
export function buildNewPost(form: unknown, now: Date): NewPost {
  const f = writeFormSchema.parse(form);
  const tags = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
  return {
    title: f.title,
    body: f.body,
    tags,
    status: f.publish ? "published" : "draft",
    ...(f.publish ? { publishedAt: now.toISOString() } : {}),
  };
}
```

- [ ] **Step 4: Run → PASS**; full `pnpm test` + `typecheck` + `lint` green.
- [ ] **Step 5: Commit** — confirm branch, `git add -A && git commit -m "feat: write-form validation + buildNewPost"`

---

## Task 2: Orchestration core + server actions

**Files:** create `src/app/write/actions-core.ts`, `src/app/write/actions-core.test.ts`, `src/app/write/actions.ts`

- [ ] **Step 1: Failing test** — `src/app/write/actions-core.test.ts`:
```ts
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
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement core** — `src/app/write/actions-core.ts`:
```ts
import type { ContentStore } from "@/content/store";
import { buildNewPost } from "@/content/post-input";

export interface WriteDeps {
  userId: string | null;
  handle: string | null;
  store: ContentStore | null;
}
export type SaveResult = { ok: true; slug: string } | { ok: false; error: string };
export type DeleteResult = { ok: true } | { ok: false; error: string };

function guard(deps: WriteDeps): string | null {
  if (!deps.userId) return "You must be signed in.";
  if (!deps.handle) return "Your account has no handle.";
  if (!deps.store) return "Content repository is not configured.";
  return null;
}

export async function runSavePost(deps: WriteDeps, form: unknown, now: Date): Promise<SaveResult> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  let post;
  try {
    post = buildNewPost(form, now);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input" };
  }
  const slug = await deps.store!.savePost(deps.handle!, post);
  return { ok: true, slug };
}

export async function runDeletePost(deps: WriteDeps, slug: string): Promise<DeleteResult> {
  const err = guard(deps);
  if (err) return { ok: false, error: err };
  await deps.store!.deletePost(deps.handle!, slug);
  return { ok: true };
}
```

- [ ] **Step 4: Run → PASS**.

- [ ] **Step 5: Implement actions** — `src/app/write/actions.ts`:
```ts
"use server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { runDeletePost, runSavePost, type WriteDeps } from "./actions-core";
import type { WriteForm } from "@/content/post-input";

async function resolveDeps(): Promise<WriteDeps> {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const [handle, store] = userId
    ? await Promise.all([getUserHandle(userId), getContentStoreForUser(userId)])
    : [null, null];
  return { userId, handle, store };
}

export async function savePostAction(form: WriteForm) {
  return runSavePost(await resolveDeps(), form, new Date());
}

export async function deletePostAction(slug: string) {
  return runDeletePost(await resolveDeps(), slug);
}
```
> NOTE: `getContentStoreForUser` is exported from `src/content/index.ts` (`@/content`). Confirm the import resolves. Verify `getCurrentUser()` returns an object with `.id`. Server actions must be async exported functions in a `"use server"` file — confirm against Next 16 docs.

- [ ] **Step 6: Verify** — `pnpm test` (core tests pass) + `typecheck` + `lint` + `pnpm build` green.
- [ ] **Step 7: Commit** — confirm branch, `git add -A && git commit -m "feat: write orchestration core + server actions"`

---

## Task 3: TipTap editor component

**Files:** create `src/components/editor.tsx`

- [ ] **Step 1: Install** — `pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit tiptap-markdown`

- [ ] **Step 2: Implement** — `src/components/editor.tsx`:
```tsx
"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";

export function Editor({
  initialMarkdown = "",
  onChange,
}: {
  initialMarkdown?: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialMarkdown,
    immediatelyRender: false, // required for Next SSR
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
  });

  // Emit initial markdown once mounted so the parent's state matches the editor.
  useEffect(() => {
    if (editor) onChange(editor.storage.markdown.getMarkdown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem", minHeight: 240 }}>
      <EditorContent editor={editor} />
    </div>
  );
}
```
> VERIFY against installed versions: `@tiptap/react` v3+ requires `@tiptap/pm`; `immediatelyRender: false` is needed under Next App Router to avoid hydration mismatch (confirm the option name in the installed version). `tiptap-markdown` exposes `editor.storage.markdown.getMarkdown()` and parses a Markdown string passed as `content` — confirm in its README/types; if the parse-on-init differs, set content via `editor.commands.setContent` in an effect. If `tiptap-markdown` is incompatible with the installed TipTap major, report and propose the closest working alternative (e.g. `@tiptap/starter-kit` + a prosemirror-markdown serializer) rather than guessing. This is the riskiest task — if blocked, report BLOCKED with specifics.

- [ ] **Step 3: Verify** — `pnpm typecheck` + `pnpm lint` + `pnpm build` succeed (the editor compiles; it's a client component). `pnpm test` still green.
- [ ] **Step 4: Commit** — confirm branch, `git add -A && git commit -m "feat: TipTap markdown editor component"`

---

## Task 4: Post form + write pages + nav link

**Files:** create `src/components/post-form.tsx`, `src/app/write/page.tsx`, `src/app/write/[slug]/page.tsx`; modify `src/app/page.tsx`

- [ ] **Step 1: Post form (client)** — `src/components/post-form.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Editor } from "./editor";
import { savePostAction } from "@/app/write/actions";

export function PostForm({
  initial,
}: {
  initial?: { title: string; tags: string; body: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);
    const res = await savePostAction({ title, tags, body, publish });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(publish ? "/" : "/write/" + res.slug);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ fontSize: "1.4rem", padding: 8 }} />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma, separated" style={{ padding: 8 }} />
      <Editor initialMarkdown={initial?.body ?? ""} onChange={setBody} />
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} onClick={() => submit(false)}>Save draft</button>
        <button disabled={busy} onClick={() => submit(true)}>Publish</button>
      </div>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </div>
  );
}
```
> NOTE: `body` state is updated by the editor via `onChange`; it's passed to the action. `initial.body` seeds the editor.

- [ ] **Step 2: New-post page (auth-gated)** — `src/app/write/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>New post</h1>
      <PostForm />
    </main>
  );
}
```

- [ ] **Step 3: Edit page (auth-gated, loads post)** — `src/app/write/[slug]/page.tsx`:
```tsx
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  if (!handle || !store) notFound();
  const post = await store.getPost(handle, slug);
  if (!post) notFound();
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Edit post</h1>
      <PostForm initial={{ title: post.title, tags: post.tags.join(", "), body: post.body }} />
    </main>
  );
}
```
> NOTE: editing a post whose title changes will create a NEW slug (savePost slugifies title) and orphan the old file — documented limitation. For v0 this is acceptable; a future improvement is to delete the old slug on rename.

- [ ] **Step 4: Nav link** — in `src/app/page.tsx` header, for signed-in users add a link to `/write` next to the handle. Minimal edit, e.g. change the signed-in branch to show `@handle · <Link href="/write">Write</Link>`.

- [ ] **Step 5: Verify** — full `pnpm test` + `typecheck` + `lint` + `pnpm build` all green; `/write` and `/write/[slug]` appear as dynamic routes.
- [ ] **Step 6: Commit** — confirm branch, `git add -A && git commit -m "feat: post form, write/edit pages, write nav link"`

---

## Done criteria for Plan 4

- `pnpm test`/`typecheck`/`lint`/`build` all pass.
- `buildNewPost` and `runSavePost`/`runDeletePost` are unit-tested (auth guards, validation, publish vs draft, slug return).
- A signed-in user gets `/write` (new) and `/write/[slug]` (edit) pages with a TipTap editor; Save draft / Publish call the server action which commits to the GitHub content repo via the existing content engine.
- Home shows a "Write" link for signed-in users.

End-to-end (actually composing → committing → reading) requires a deployed instance with GitHub OAuth + Neon + a content repo. After this plan, the v0 loop (write → publish → read) is feature-complete.
```
