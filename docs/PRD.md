# Sumi 墨 — Product Requirements Document

> Status: v1 · Page: product requirements for completing the Sumi publishing platform
> Companion spec: `docs/superpowers/specs/2026-06-12-open-source-note-platform-design.md`

## 1. Summary

Sumi (墨) is an open-source, Vercel-deployable, multi-creator publishing platform
styled after note.com. Creators sign in with GitHub (allowlist-gated), write
Markdown in a clean TipTap editor, and every article, image, comment, and magazine
is committed to a GitHub repository the owner controls — a portable, version-controlled
archive of everything published.

## 2. Goals & Non-goals

Goals:
1. One-click Vercel deploy.
2. GitHub login + content stored in a GitHub repo.
3. A great writing experience (TipTap → Markdown).
4. Contributor-friendly: single codebase, TypeScript end-to-end.

Non-goals (explicitly out of scope): paid content, algorithmic recommendations,
nested comments, mobile app, likes/follows (future, stored in Neon).

## 3. Personas

- **Creator** — journals, essays, serialized writing; wants a clean editor, easy publish,
  a distinct homepage, and the reassurance that content is backed up in Git.
- **Reader** — wants a quiet, typography-first reading experience, per-creator pages,
  tags, and the ability to leave a plain comment.

## 4. Core user journeys

1. Sign in with GitHub (allowlist only) → land on a curated home feed.
2. Write → add title/tags → save draft or publish → article readable at `/@handle/<slug>`.
3. Upload an image into a post (committed to the content repo).
4. Read an article → view/leave a comment.
5. Browse a creator's homepage and their magazines (collections).
6. Manage their profile (display name, bio) from `/settings`.

## 5. Architecture (already built)

- Next.js (App Router) + TypeScript on Vercel.
- Accounts/sessions → Neon Postgres via Drizzle + Better Auth (GitHub OAuth, allowlist gate).
- Content (articles/images/comments/magazines) → a GitHub repo via Octokit.
- `ContentStore` abstraction is the migration seam between GitHub and a future DB store.

## 6. Functional requirements

### FR-1 Authentication (done)
- GitHub OAuth; only `ALLOWED_GITHUB_USERS` may sign in (empty = deny all).

### FR-2 Writing & reading (done)
- TipTap editor serialized to Markdown + YAML frontmatter.
- Draft vs published; tags; cover; publishedAt preserved on edit.
- Article page `/@handle/<slug>` (SSR, SEO, OG-ready, typography prose).
- Creator homepage `/@handle`; home feed (newest published); tag pages `/tag/<slug>`.
- Image upload committed to the content repo.

### FR-3 Comments
- Any signed-in user may comment on any published post.
- Comment stored as `content/@<handle>/<slug>/comments/<ts>-<author>.md`
  with frontmatter (`author`, `date`) + body; flat, time-ordered.
- **Nested replies** (NEW): a comment may carry an optional `parent` reference
  (its `id` = the comment filename). Threads render as an indented tree with an
  inline "Reply" composer per comment.
- Comments render under the article; a small form allows signed-in users to add one.
- Anonymous/unsigned visitors see comments but not the form.

### FR-4 Magazines / collections (NEW — this PRD)
- A creator curates their own posts into a named, ordered collection ("magazine").
- Stored as `content/@<handle>/magazines/<mag>.md` with frontmatter (`title`, `description`, `items[]`).
- Magazine page `/@handle/m/<mag>`, plus creation UI in `/write/magazines`.
- Only the owning creator may create/edit their magazines.

### FR-5 Profile & settings (NEW — this PRD)
- Creator profile stored as `content/@<handle>/profile.md` (`displayName`, `bio`).
- `/settings` page lets the signed-in creator edit their own profile.
- Creator homepage renders their profile (display name + bio).

### FR-6 Docs & deploy
- Update README with full env-var table, migration steps, and feature list.

### FR-7 Search (NEW)
- Full-text search page `/search` (`?q=...`), matching title, body, excerpt, and tags.
- Only published posts; results newest-first with the owning creator handle.

### FR-8 Postgres mirror (NEW)
- Optional `DbContentStore` mirrors content into the `sumi_*` Postgres tables
  (created by the `0001` migration). Enabled with `DB_MIRROR=1`; reads/search
  then come from Postgres instead of GitHub.

## 7. Non-functional requirements

- Serverless-safe: no local FS writes for content; all via GitHub API / Neon.
- Testable: frontmatter parse/serialize, paths, action cores, and store integration
  are unit-tested; auth gates use pglite.
- Clean `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

## 8. Acceptance criteria

- [ ] Signed-in user can comment on a published post or reply to a thread; comment persists and renders.
- [x] Creator can create a magazine, add posts, and view it at `/@handle/m/<mag>`.
- [x] Creator can edit their profile in `/settings`; it renders on their homepage.
- [x] `/search` returns published posts by full-text query.
- [x] `DB_MIRROR=1` serves reads/search from the Postgres mirror.
- [ ] All unit tests pass; typecheck, lint, and build are green.
- [ ] README documents env vars + features.

## 9. Open questions / future

- Likes(スキ) and follows → store in Neon later.
- Notifications; full-text search index tuning / DB-backed ranking (future).
- Nesting depth limit / moderation for comment threads (future).
