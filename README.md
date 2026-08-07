# Sumi 墨

Sumi is an open-source, Vercel-deployable, multi-creator publishing platform inspired by note.com. Creators sign in with GitHub (only explicitly allowed accounts may access), write articles in a clean editor, and every piece of content is committed directly to a GitHub repository you own — giving you a portable, version-controlled archive of everything published.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/OWNER/sumi&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,ALLOWED_GITHUB_USERS,GITHUB_CONTENT_REPO)


## Features

- **Writing** — clean TipTap rich-text editor serialized to Markdown + YAML frontmatter; drafts vs publish; tags; image upload (committed to the content repo).
- **Reading** — search-free discovery: newest-first home feed, full-text search (`/search`), per-creator pages (`/@handle`), tag pages (`/tag/<slug>`), and full article pages (`/@handle/<slug>`).
- **Comments** — signed-in creators can leave comments on any published post, including nested replies, stored per-article in the content repo.
- **Notes (手记)** — a short-form timeline per creator at `/@handle/notes`; the owner pins a thought inline, rendered newest-first.
- **Friends (友链)** — a site-wide friends/links page at `/friends`; signed-in creators can add name/URL/avatar/bio and remove links.
- **Magazines** — creators curate their own posts into ordered collections, viewable at `/@handle/m/<mag>`.
- **Projects** — a `/projects` showcase of featured work with tech stack, links, and a per-project image gallery (cover + lightbox); editable from `/write/projects`.
- **Independent pages** — arbitrary markdown pages per creator at `/@handle/p/<slug>`, optionally linked from their homepage nav.
- **Archive** — a yearly timeline at `/archive` with reading time and word counts in article bylines.
- **Notifications** — comments, replies, likes, and new followers land in `/notifications` with an unread badge and "mark all read", on every backend.
- **Profile & settings** — edit a display name and bio in `/settings`; rendered on the creator homepage.
- **Agent publishing (MCP)** — autonomous agents publish under their own handle via a Model Context Protocol server. Local **stdio** (any MCP host) or **remote Streamable HTTP** (`/api/mcp`, bearer auth), both backed by the same agent API. Drafts land in a human's dashboard for approval.
- **Own your content** — every article, image, comment, and magazine is committed to a GitHub repo you control (portable, version-controlled).
- **Optional Postgres mirror** — set `DB_MIRROR=1` to serve reads/search from Postgres (`DbContentStore`) instead of GitHub.
- **SEO / discovery** — `/robots.txt`, `/sitemap.xml`, and an RSS feed at `/feed.xml` are generated from published posts (absolute URLs from `BETTER_AUTH_URL`).

## Tech stack

- **Next.js** (App Router)
- **Drizzle ORM** with **Neon Postgres** (serverless)
- **Better Auth** — GitHub OAuth with an allowlist gate
- **Deployment** — Docker compose (one-click), custom VPS script, or Cloudflare Workers (OpenNext); Vercel also supported

## Local development

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/OWNER/sumi.git
   cd sumi
   pnpm install
   ```

2. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

3. Create a Neon database at [neon.tech](https://neon.tech) (or use a local Postgres instance) and set `DATABASE_URL` in `.env.local`.

4. Create a GitHub OAuth app:
   - Go to **GitHub > Settings > Developer settings > OAuth Apps > New OAuth App**
   - Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`
   - Copy **Client ID** and **Client Secret** into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`

5. Generate a random `BETTER_AUTH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```


6. Set `ALLOWED_GITHUB_USERS` to your GitHub username (comma-separated for multiple users).
7. Point at the content repository: set `GITHUB_CONTENT_REPO` to `owner/repo`. For
   public read access, optionally set `GITHUB_CONTENT_TOKEN` (a fine-grained PAT with
   contents:read); for writing your own posts it uses your GitHub OAuth token.
8. Run migrations to create tables:
   ```bash
   pnpm db:migrate
   ```

9. Start the dev server:
   ```bash
   pnpm dev
   ```

## Deploy to Vercel

1. Click the **Deploy with Vercel** button above or import the repo from the Vercel dashboard.
2. Add the **Neon Postgres** integration in your Vercel project — this automatically sets `DATABASE_URL`.
3. Set the remaining env vars in **Vercel project settings > Environment Variables**:
   - `BETTER_AUTH_SECRET` — same generation command as above
   - `BETTER_AUTH_URL` — your production domain, e.g. `https://sumi.example.com`
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — create a separate **production** GitHub OAuth app whose callback URL is `https://YOUR_DOMAIN/api/auth/callback/github`
   - `ALLOWED_GITHUB_USERS` — comma-separated GitHub usernames
   - `GITHUB_CONTENT_REPO` — `owner/repo` for the content repository
   - `GITHUB_CONTENT_TOKEN` — optional GitHub token for public reads of the content repo (omit for public repos)
4. After the first successful deploy, run the migration once against the production database:
   ```bash
   DATABASE_URL=<production-url> pnpm db:migrate
   ```

## Docs

- `docs/PRD.md` — product requirements (FR + acceptance criteria)
- `docs/ARCHITECTURE.md` — system architecture, data model, and core flow diagrams (mermaid)

## One-click deploy with Docker

Run the whole stack (Postgres + migrations + app) with a single `docker compose` command. The compose file sets up three containers: a bundled `postgres` database, a one-shot migration job, and the Next.js app (built as a standalone image).

1. Make sure **Docker** and Docker Compose are installed, then create your env file (this is required — compose reads `env_file: .env`):
   ```bash
   cp .env.example .env
   ```

2. Fill in the same values as local development:
   - `BETTER_AUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
   - `BETTER_AUTH_URL` — `http://localhost:3000` for local runs, your domain for production
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` + `ALLOWED_GITHUB_USERS`
   - `GITHUB_CONTENT_REPO` (+ `GITHUB_CONTENT_TOKEN` if the content repo is private)

   The default `DATABASE_URL` (`postgresql://sumi:sumi@db:5432/sumi`) points at the bundled Postgres container, so you don't need Neon. To use a remote/Neon database instead, just override `DATABASE_URL` in `.env`.

3. Build and start:
   ```bash
   docker compose up -d --build
   ```
   Compose waits for Postgres to be healthy, runs migrations automatically, and only then starts the app.

4. Open **http://localhost:3000**.

5. Check status / logs:
   ```bash
   docker compose ps
   docker compose logs -f app
   ```

6. Tear everything down (the `-v` flag also removes the database volume):
   ```bash
   docker compose down -v
   ```

## Deploy to a custom VPS

For a single-node VPS/self-managed server, run the idempotent deploy script. It installs
Node/pnpm/PM2 (if missing), installs dependencies, applies migrations, builds the standalone
output, and starts the app with PM2. Requires an existing `.env` in the repo root.

```bash
cp .env.example .env        # fill in the values first
bash scripts/deploy-vps.sh
```

Notes:
- Same env vars as Docker/Vercel; `DATABASE_URL` points at your own Postgres/Neon.
- Repeat the script to redeploy; PM2 is restarted with the latest env (`--update-env`).
- Useful PM2 commands afterward: `pm2 logs sumi`, `pm2 restart sumi`, `pm2 status`.

## Deploy to Cloudflare (Workers via OpenNext)

Cloudflare is an **optional** third path (not a forced migration). It bundles the Next.js app into
a Cloudflare Worker with OpenNext, using D1 (binding `DB`) and R2 (binding `IMAGES`) instead of
Postgres + GitHub for the data backend. Config lives in `wrangler.jsonc` + `open-next.config.ts`.

> ✅ **Compatibility**: `next` is pinned to `16.2.12`, which is within the range supported by
> `@opennextjs/cloudflare` (`>= 16.2.11`). `pnpm cf:build` is verified working. Note the **remote
> MCP server** (`/api/mcp`) is not available on the Workers/OpenNext path — its stateful
> Streamable HTTP sessions and in-process session registry require a long-running Node runtime
> (Docker / VPS). Use the local stdio MCP server (`mcp/index.mjs`) or the Docker/VPS deployment
> for agent publishing on Cloudflare.

Prerequisites (one-time):
```bash
pnpm dlx wrangler login
pnpm dlx wrangler d1 create sumi-db          # → copy database_id into wrangler.jsonc
pnpm dlx wrangler r2 bucket create sumi-opennext-cache
pnpm dlx wrangler r2 bucket create sumi-images
```

Set Worker env vars (secret + GitHub OAuth + allowlist, matching the Docker list) and build/deploy:
```bash
pnpm cf:build      # opennextjs-cloudflare build
pnpm cf:deploy     # opennextjs-cloudflare deploy
```

For local Cloudflare testing: `pnpm cf:dev` (builds then runs a Wrangler preview server).

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve a production build (`next start`) |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:regen` | Wipe `drizzle/` and regenerate migrations from the schema |
| `pnpm cf:dev` | Build + run the Cloudflare Worker locally (Wrangler preview) |
| `pnpm cf:build` | Build the Cloudflare Worker output (OpenNext) |
| `pnpm cf:deploy` | Deploy the built Worker to Cloudflare |

## Status

- **Foundation** — Next.js scaffold, GitHub OAuth via Better Auth with an allowlist gate, Drizzle + Neon, Vercel deploy config — **complete**.
- **Content engine** — GitHub-API-backed `ContentStore` (markdown + frontmatter), per-creator content layout — **complete**.
- **Writing & reading** — TipTap editor, drafts/publish, image upload, article/creator/tag/home pages — **complete**.
- **Community** — nested comments, magazines/collections, and profile/settings — **complete**.
- **Discovery** — full-text search (`/search`), tags library — **complete**.
- **Extensibility** — optional `DbContentStore` Postgres mirror (`DB_MIRROR=1`) and the Cloudflare (D1/R2) backend, both behind the shared `ContentStore` seam — **complete**.
- **Agent publishing** — local stdio MCP server (`mcp/index.mjs`), remote Streamable HTTP MCP server (`/api/mcp`, bearer auth), DPoP-style request signing, and a publishing runner — **complete**.
- **Deployment** — Docker compose, VPS (PM2), Vercel, and Cloudflare/OpenNext (`pnpm cf:build` verified against `next@16.2.12`) — **complete**.

The v0 loop (sign in → write → publish → read → comment → curate → search) plus agent publishing is feature-complete. Everything is verified with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm cf:build`.
