# Sumi 墨 — Product Requirements Document

> Status: v1.2 · Page: product requirements for the Sumi personal-space platform

## 1. Summary

Sumi (墨) is an open-source **personal-space portal** styled after mx-space / Shiro:
a full-stack homepage + blog + notes system that runs on **free Cloudflare
infrastructure** (D1 + R2) or your own Docker / VPS. Creators sign in with GitHub
(allowlist-gated), write Markdown in a clean TipTap editor, and every article,
image, comment, magazine, and profile is stored in the owner's own database —
Postgres (`sumi_*` tables, Docker/VPS/Vercel) or Cloudflare D1+R2 — a portable,
version-controlled archive of everything published.

## 2. Goals & Non-goals

Goals:
1. One-command Docker deploy (`docker compose up -d`) plus free Cloudflare deploy.
2. GitHub login + content stored in your own database (Postgres or D1).
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
3. Upload an image into a post (stored with the post).
4. Read an article → view/leave a comment.
5. Browse a creator's homepage and their magazines (collections).
6. Manage their profile (display name, bio) from `/settings`.

## 5. Architecture (already built)

- Next.js (App Router) + TypeScript on Vercel.
- Next.js (App Router) + TypeScript, deployable to Cloudflare Workers, Docker, or a VPS.
- Accounts/sessions → Postgres/D1 via Drizzle + Better Auth (GitHub OAuth, allowlist gate).
- Content (articles/images/comments/magazines/profile) → Postgres `sumi_*` tables (`DbContentStore`), or D1+R2 on Cloudflare.
- `ContentStore` abstraction is the seam between Postgres (primary) and Cloudflare backends.

## 6. Functional requirements

### FR-1 Authentication (done)
- GitHub OAuth; only `ALLOWED_GITHUB_USERS` may sign in (empty = deny all).

### FR-2 Writing & reading (done)
- TipTap editor serialized to Markdown + YAML frontmatter.
- Draft vs published; tags; cover; publishedAt preserved on edit.
- Article page `/@handle/<slug>` (SSR, SEO, OG-ready, typography prose).
- Creator homepage `/@handle`; home feed (newest published); tag pages `/tag/<slug>`.
- Image upload stored with the post.

### FR-3 Comments
- Any signed-in user may comment on any published post.
- Comment stored per-post in `sumi_comments` (Postgres / D1) with frontmatter
  (`author`, `date`) + body; flat, time-ordered.
- **Nested replies** (NEW): a comment may carry an optional `parent` reference
  (its `id` = the comment filename). Threads render as an indented tree with an
  inline "Reply" composer per comment.
- Comments render under the article; a small form allows signed-in users to add one.
- Anonymous/unsigned visitors see comments but not the form.

### FR-4 Magazines / collections (NEW — this PRD)
- A creator curates their own posts into a named, ordered collection ("magazine").
- Stored per-creator in `sumi_magazines` (Postgres / D1) with frontmatter
  (`title`, `description`, `items[]`).
- Magazine page `/@handle/m/<mag>`, plus creation UI in `/write/magazines`.
- Only the owning creator may create/edit their magazines.

### FR-5 Profile & settings (NEW — this PRD)
- Creator profile stored per-creator in `sumi_profiles` (Postgres / D1) with
  `displayName`, `bio`.
- `/settings` page lets the signed-in creator edit their own profile.
- Creator homepage renders their profile (display name + bio).

### FR-6 Docs & deploy
- Update README with full env-var table, migration steps, and feature list.

### FR-7 Search (NEW)
- Full-text search page `/search` (`?q=...`), matching title, body, excerpt, and tags.
- Only published posts; results newest-first with the owning creator handle.

### FR-8 Postgres storage (primary)
- `DbContentStore` stores content in the `sumi_*` Postgres tables (created by
  the `0001` migration). Enabled with `DB_MIRROR=1`; reads/writes/search come
  from Postgres.

### FR-9 Likes & follows (done)
- Like/unlike any published post; count + active state stored per post
  (`sumi_likes` in Postgres/D1).
- Follow/unfollow creators with a Follow button on the profile page, stored in
  `sumi_follows` (Postgres/D1).

### FR-10 Deployment (done)
- **Cloudflare free tier**: `pnpm cf:build && pnpm cf:deploy`; D1 (`DB`) for
  sessions/content, R2 (`IMAGES`) for images. `CF_ENABLED=1` selects this backend.
- **Docker one-click**: `docker compose up -d --build` at `http://localhost:3005`.
- **Custom VPS**: `bash scripts/deploy-vps.sh` (Node/pnpm/PM2, migrations, PM2 daemon).

### FR-11 UI design system (done)
- Ink-on-paper tokens in `src/app/globals.css`: washi paper, sumi ink, single
  cinnabar seal accent, light/dark modes, tinted shadows, paper grain.
- Dark mode "ink at night": warm layered near-black surfaces (page > card >
  sunken input), moonlit radial glow, warm shadows; a nav toggle cycles
  light / dark / system with a no-flash pre-render init and localStorage
  persistence.
- Geist (UI) + Newsreader (reading) via `next/font/google`; Phosphor icon family.
- Portal home (asymmetric identity + stats + seal CTA + latest ink + tag cloud);
  editorial post index with date column and hover lift.

### FR-12 Archive & reading time (NEW — this PRD)
- `/posts` timeline groups every published post by year (newest first), with
  a per-post day column, owner handle, and tag line; linked from the footer and
  registered in the sitemap.
- Article pages show an estimated reading time and word count in the byline
  (`estimateReadingTime` in `src/lib/reading-time.ts`); CJK characters count as
  words, code fences/images/link URLs are ignored.

### FR-13 Projects showcase & independent pages (NEW — this PRD)
- Projects library at `/projects`: every creator's featured work, card grid with
  title, description, tech stack, links (site + repo), and cover image. Sorting
  is featured-first, then explicit order, then title.
- Creator's own `/write/projects` list + editor (`project-form.tsx`): title,
  description, URL, repo, tech stack via a searchable tag picker, cover image,
  featured flag, and sort order. `saveProjectAction`/`deleteProjectAction` gate
  on sign-in and validate URL/required fields.
- Independent pages (自定义独立页) at `/@handle/p/<slug>`: arbitrary markdown
  pages per creator with optional `showInNav` link on their homepage. Editor at
  `/write/pages` uses the shared Tiptap `Editor`; `savePageAction`/
  `deletePageAction` gate on sign-in and require a title + body.
- All CRUD lands in the same content layout (GitHub `content/@<handle>/projects|pages`,
  Postgres `sumi_projects`/`sumi_pages`, D1 `projects`/`pages`) and stays out of
  `listPosts`; pages registered in the sitemap collector.

### FR-14 Notifications (NEW — this PRD)
- Inbox at `/notifications` for the signed-in creator: comments, replies, likes
  and new followers, newest first, with a read/unread state and "Mark all read".
- Triggered server-side from the community actions: a comment or reply notifies
  the post author (`commentId` + body snippet), a like notifies the post author,
  a follow notifies the followee; self-actions never notify yourself.
- Anti-spam dedupe: the same actor + type + post within the same day collapses to
  a single unread notification, so like/follow toggling cannot flood the inbox.
- Bell entry with an unread badge in the nav (client-fetches the unread count);
  storage per backend: GitHub `content/@<handle>/notifications.json` (capped at
  100), Postgres `sumi_notifications`, D1 `notifications`.

### FR-15 Project gallery images (NEW — this PRD)
- Each project carries an optional `gallery` list of image URLs (screenshots /
  shots), alongside the existing single cover image.
- `/write/projects` form grows an add/remove list of gallery image URLs
  (validated as `http(s)`); editing an existing project preserves the gallery.
- `/projects` cards render a cover strip (cover image, falling back to the first
  gallery image) plus a thumbnail grid with a keyboard-navigable lightbox
  (Escape closes, arrow keys step, counter shows position).
- Stored per backend: GitHub `gallery` frontmatter array in each project file,
  Postgres `sumi_projects.gallery` (JSON text), D1 `projects.gallery`; the
  `0012_projects_gallery` migration adds the Postgres column.

### FR-16 Agent / automation publishing (done)
- Autonomous agents publish under their own creator handle through a Model
  Context Protocol (MCP) server, instead of the human OAuth flow.
- Two transports share one agent API (`/api/agent/*`): a local zero-dependency
  stdio server (`mcp/index.mjs`) for any MCP host, and a remote Streamable HTTP
  server (`/api/mcp`, sessions via `Mcp-Session-Id`) for deployed instances on
  Docker / VPS runtimes.
- Two-factor agent auth (DPoP-style): a hashed bearer key identifies the agent,
  and every request is signed with the agent's Ed25519 private JWK over a
  canonical `method + path + body-hash + timestamp` string. A leaked bearer key
  alone cannot impersonate the agent; signatures are replay-guarded by a
  timestamp window.
- Tools: `sumi_write_post` (draft by default, `publish: true` to publish now),
  `sumi_update_post` (edit title/body/tags/cover or flip publish),
  `sumi_list_posts`, `sumi_search_posts`, `sumi_upload_image`, and
  `sumi_get_agent_info`.
- Safe by default: agent posts land as **drafts**; a signed-in human reviews
  and approves or deletes them from the `/write` dashboard (agent drafts carry
  an `agent` flag and are grouped per agent handle). `scripts/create-agent.ts`
  issues credentials once; the plaintext key and private JWK are never stored.
- Agent posts flow through the same `ContentStore` seam, so Postgres /
  Cloudflare / optional GitHub backends all work unchanged.

### FR-17 AI 总结 · 共读（NEW — this PRD）
- 每位创作者在 `/settings → AI 总结` 配置自己的 OpenAI 兼容 provider
  （Base URL / API Key / Model / 开关），API Key 只存服务端、不回显明文。
- 生成是**手动**的：文章**发布不会**自动生成；作者在 `/write/[slug]` 编辑页
  点「一键生成 AI 总结」才会同步调用 LLM 生成中文总结（一段式总结 + TL;DR + 3-5 条锚点要点），
  结果落库；不满意可随时点「重新生成」（每次基于最新正文重新生成）。
- 文章页标题下方、正文上方渲染「AI 总结 · 共读」卡片：done 显示总结内容，
  pending/running 显示骨架屏并短时轮询 `/api/ai/task`（超时提示回编辑页重试），
  failed 显示错误；总结要点带 `#anchor` 超链接，点击跳转到对应小标题。
- 未配置/未启用 provider 时优雅降级：不渲染面板、不阻断发布；
  Cloudflare D1 后端不提供 AI 存储，返回 null 静默关闭。

### FR-18 MCP 优先的 agent 测试通道（NEW — this PRD）
- 验证 agent 发文章流程时，优先通过 MCP 工具（`sumi_write_post` /
  `sumi_update_post` / `sumi_list_posts`）而非直接调用 HTTP 脚本，保证
  MCP 通道（stdio + Streamable HTTP）本身就是被测试的对象。

## 7. Non-functional requirements

- Serverless-safe: no local FS writes for content; all via the `ContentStore`
  seam (Postgres `DbContentStore`, Cloudflare D1+R2).
- Testable: frontmatter parse/serialize, paths, action cores, and store integration
  are unit-tested; auth gates use pglite.
- Clean `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

## 8. Acceptance criteria

- [x] Signed-in user can comment on a published post or reply to a thread; comment persists and renders.
- [x] Creator can create a magazine, add posts, and view it at `/@handle/m/<mag>`.
- [x] Creator can edit their profile in `/settings`; it renders on their homepage.
- [x] `/search` returns published posts by full-text query.
- [x] `DB_MIRROR=1` serves reads/writes/search from the Postgres `sumi_*` tables.
- [x] Likes and follows work on Postgres + Cloudflare + GitHub backends.
- [x] Portal home, tag cloud, and ink-on-paper design system ship in the UI.
- [x] Handnotes (手记) timeline at `/[handle]/notes` with an inline composer for the owner; newest first.
- [x] Friends (友链) page at `/friends` with add/remove for signed-in creators; works on all three backends.
- [x] `/posts` renders published posts grouped by year; article bylines show reading time + word count.
- [x] `/projects` showcases featured work; `/@handle/p/<slug>` renders custom markdown pages; both are editable in `/write` and work on all three backends.
- [x] Comments, replies, likes, and follows notify the recipient in `/notifications`; nav shows an unread badge and "Mark all read" works on all three backends.
- [x] Projects support a gallery of images rendered on the `/projects` cards with a lightbox; the gallery edits from `/write/projects` and round-trips on all three backends.
- [x] An MCP server (stdio + remote Streamable HTTP) lets agents create/update/list/search posts and upload images under their own handle; new posts are drafts until a human approves them from `/write`.
- [x] Agent requests are authenticated with bearer key + Ed25519 signature and replay-guarded timestamps; `scripts/create-agent.ts` mints one-time credentials.
- [x] `/settings → AI 总结` 可保存/测试 OpenAI 兼容 provider（内置 OpenCode Zen 预设）；在 `/write` 编辑页手动一键生成/重新生成总结，卡片显示在文章正文上方且要点可锚点跳转；未配置时优雅降级。
- [x] All unit tests pass; typecheck, lint, and build are green.
- [x] README documents env vars + features.

## 9. Open questions / future

- Full-text search index tuning / DB-backed ranking (done: relevance scoring + pg_trgm GIN index).
- Moderation tooling for comment threads (done: comment authors or the post's
  author can delete a comment via a Delete button; nesting cap of 4 is enforced
  server-side across all backends, still renders replies as threaded).
