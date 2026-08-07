# Sumi 墨 — Product Requirements Document

> Status: v1.2 · Page: product requirements for the Sumi personal-space platform
> Companion spec: `docs/superpowers/specs/2026-06-12-open-source-note-platform-design.md`

## 1. Summary

Sumi (墨) is an open-source **personal-space portal** styled after mx-space / Shiro:
a full-stack homepage + blog + notes system that runs on **free Cloudflare
infrastructure** (D1 + R2) or your own Docker / VPS. Creators sign in with GitHub
(allowlist-gated), write Markdown in a clean TipTap editor, and every article,
image, comment, magazine, and profile is committed to a repository the owner
controls, or stored in D1+R2, a portable, version-controlled archive of
everything published.

## 2. Goals & Non-goals

Goals:
1. One-command Docker deploy (`docker compose up -d`) plus free Cloudflare deploy.
2. GitHub login + content stored in a GitHub repo.
3. A great writing experience (TipTap → Markdown).
4. Contributor-friendly: single codebase, TypeScript end-to-end.
5. Ink-on-paper design language: Geist + Newsreader, Phosphor icons, portal home
   with identity, latest posts, and tag cloud.

Non-goals (explicitly out of scope): paid content, algorithmic recommendations,
notifications, native mobile app.

## 3. Personas

- **Creator** — journals, essays, serialized writing; wants a clean editor, easy publish,
  a distinct homepage, and the reassurance that content is backed up in Git.
- **Reader** — wants a quiet, typography-first reading experience, per-creator pages,
  tags, and the ability to leave a plain comment.

## 4. Core user journeys

1. Sign in with GitHub (allowlist only) → land on the portal home (identity, stats, latest ink, tag cloud).
2. Write → add title/tags → save draft or publish → article readable at `/@handle/<slug>`.
3. Upload an image into a post (committed to the content repo).
4. Read an article → view/leave a comment.
5. Browse a creator's homepage and their magazines (collections).
6. Manage their profile (display name, bio) from `/settings`.

## 5. Architecture (already built)

- Next.js (App Router) + TypeScript on Vercel.
- Next.js (App Router) + TypeScript, deployable to Cloudflare Workers, Docker, or a VPS.
- Accounts/sessions → Postgres/D1 via Drizzle + Better Auth (GitHub OAuth, allowlist gate).
- Content (articles/images/comments/magazines/profile) → a GitHub repo via Octokit, or D1+R2 on Cloudflare.
- `ContentStore` abstraction is the seam between GitHub, Postgres mirror, and Cloudflare backends.

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

### FR-9 Likes & follows (done)
- Like/unlike any published post; count + active state stored per post
  (`likes.json`) and mirrored in `sumi_likes`.
- Follow/unfollow creators with a Follow button on the profile page, stored in
  `following.json` files and mirrored in `sumi_follows`.

### FR-10 Deployment (done)
- **Cloudflare free tier**: `pnpm cf:build && pnpm cf:deploy`; D1 (`DB`) for
  sessions/content, R2 (`IMAGES`) for images. `CF_ENABLED=1` selects this backend.
- **Docker one-click**: `docker compose up -d --build` at `http://localhost:3005`.
- **Custom VPS**: `bash scripts/deploy-vps.sh` (Node/pnpm/PM2, migrations, PM2 daemon).

### FR-11 UI design system (done)
- Ink-on-paper tokens in `src/app/globals.css`: washi paper, sumi ink, single
  cinnabar seal accent, light/dark modes, tinted shadows, paper grain.
- Geist (UI) + Newsreader (reading) via `next/font/google`; Phosphor icon family.
- Portal home (asymmetric identity + stats + seal CTA + latest ink + tag cloud);
  editorial post index with date column and hover lift.

## 7. Non-functional requirements

- Serverless-safe: no local FS writes for content; all via GitHub API / Neon.
- Testable: frontmatter parse/serialize, paths, action cores, and store integration
  are unit-tested; auth gates use pglite.
- Clean `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

## 8. Acceptance criteria

- [x] Signed-in user can comment on a published post or reply to a thread; comment persists and renders.
- [x] Creator can create a magazine, add posts, and view it at `/@handle/m/<mag>`.
- [x] Creator can edit their profile in `/settings`; it renders on their homepage.
- [x] `/search` returns published posts by full-text query.
- [x] `DB_MIRROR=1` serves reads/search from the Postgres mirror.
- [x] Likes and follows work on GitHub + mirror backends.
- [x] Portal home, tag cloud, and ink-on-paper design system ship in the UI.
- [x] All unit tests pass; typecheck, lint, and build are green.
- [x] README documents env vars + features.

## 9. Open questions / future

- Notifications; handnotes (手记) timeline; friends/links (友链) page; projects showcase.
- Full-text search index tuning / DB-backed ranking (done: relevance scoring + pg_trgm GIN index).
- Moderation tooling for comment threads (done: comment authors or the post's
  author can delete a comment via a Delete button; nesting cap of 4 is enforced
  server-side across all backends, still renders replies as threaded).
