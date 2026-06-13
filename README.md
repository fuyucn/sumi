# Sumi 墨

Sumi is an open-source, Vercel-deployable, multi-creator publishing platform inspired by note.com. Creators sign in with GitHub (only explicitly allowed accounts may access), write articles in a clean editor, and every piece of content is committed directly to a GitHub repository you own — giving you a portable, version-controlled archive of everything published.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/OWNER/sumi&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,ALLOWED_GITHUB_USERS,GITHUB_CONTENT_REPO)

## Tech stack

- **Next.js** (App Router)
- **Drizzle ORM** with **Neon Postgres** (serverless)
- **Better Auth** — GitHub OAuth with an allowlist gate
- **Vercel** — deployment target

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

7. Run migrations to create tables:
   ```bash
   pnpm db:migrate
   ```

8. Start the dev server:
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
4. After the first successful deploy, run the migration once against the production database:
   ```bash
   DATABASE_URL=<production-url> pnpm db:migrate
   ```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |

## Status

**Plan 1** (project foundation: Next.js scaffold, GitHub OAuth via Better Auth, allowlist gate, Drizzle schema, Neon integration, Vercel deploy config) — **complete**.

**Plan 2** — content engine: writing and reading articles via the GitHub API, profile pages, feed — coming next.
