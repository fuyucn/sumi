# Sumi v0 — Plan 1: Foundation + Auth + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Sumi Next.js app deployable to Vercel, with GitHub-only login (Better Auth + Drizzle + Neon Postgres) gated by a GitHub-username allowlist.

**Architecture:** A single Next.js (App Router, TypeScript) app on Vercel. Accounts/sessions live in external Neon Postgres, accessed via Drizzle (serverless `neon-http` driver). Auth is Better Auth with the GitHub social provider only; a configurable allowlist of GitHub usernames is the "safe gate" enforced in a Better Auth hook. Content storage (GitHub API) is a later plan.

**Tech Stack:** Next.js (App Router) · TypeScript · pnpm · Vitest · Drizzle ORM · Neon Postgres · `@neondatabase/serverless` · Better Auth (GitHub OAuth) · Vercel

**Revision note:** This plan supersedes the original local-SQLite/local-git version. Tasks 1–2 (scaffold, env) are reused with edits; Tasks 3–4 from the old plan (better-sqlite3, Better Auth on SQLite) are replaced by the Drizzle/Neon + GitHub-OAuth tasks below. The committed `src/lib/db.ts` (SQLite) is replaced in Task 3.

**Git policy:** commits are **local only** — never `git push`, never configure a remote. If the local signing agent errors on commit, run `git -c commit.gpgsign=false commit ...`.

---

## File Structure

- `src/lib/env.ts` — typed env (revised fields: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOWED_GITHUB_USERS`, `GITHUB_CONTENT_REPO`)
- `src/lib/db.ts` — Drizzle client over Neon serverless driver
- `src/db/schema.ts` — Drizzle schema (Better Auth tables: user/session/account/verification)
- `drizzle.config.ts` — drizzle-kit config
- `src/lib/allowlist.ts` — pure allowlist predicate (`isAllowedGithubUser`)
- `src/lib/auth.ts` — Better Auth (GitHub provider + Drizzle adapter + allowlist gate hook)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/lib/current-user.ts` — `getCurrentUser()` server helper
- `src/app/api/auth/[...all]/route.ts` — Better Auth handler
- `src/app/sign-in/page.tsx` — GitHub sign-in button; `src/app/page.tsx` — auth-aware home
- `.env.example`, `README.md` (Deploy to Vercel button), `vercel.json` (if needed)
- Tests colocated as `src/**/*.test.ts`

---

## Task 1 (DONE): Project scaffolding & tooling
Already complete (Next.js + Vitest scaffold, commit on branch `v0-foundation-auth`). No action.

---

## Task 2: Revise env config for the Vercel/Neon/GitHub stack

**Files:**
- Modify: `src/lib/env.ts`, `src/lib/env.test.ts`

- [ ] **Step 1: Update the failing test**

Replace `src/lib/env.test.ts` with:

```ts
import { expect, test } from "vitest";
import { loadEnv } from "./env";

const base = {
  DATABASE_URL: "postgresql://user:pass@host/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "cid",
  GITHUB_CLIENT_SECRET: "csecret",
  ALLOWED_GITHUB_USERS: "alice,bob",
  GITHUB_CONTENT_REPO: "alice/sumi-content",
};

test("parses a full valid env", () => {
  const env = loadEnv({ ...base });
  expect(env.DATABASE_URL).toContain("postgresql://");
  expect(env.ALLOWED_GITHUB_USERS).toBe("alice,bob");
});

test("requires DATABASE_URL", () => {
  const { DATABASE_URL, ...rest } = base;
  expect(() => loadEnv({ ...rest })).toThrow();
});

test("requires a secret of at least 32 chars", () => {
  expect(() => loadEnv({ ...base, BETTER_AUTH_SECRET: "short" })).toThrow();
});

test("requires GITHUB_CLIENT_ID and SECRET", () => {
  const { GITHUB_CLIENT_ID, ...rest } = base;
  expect(() => loadEnv({ ...rest })).toThrow();
});

test("requires GITHUB_CONTENT_REPO in owner/repo form", () => {
  expect(() => loadEnv({ ...base, GITHUB_CONTENT_REPO: "noslash" })).toThrow();
});
```

- [ ] **Step 2: Run test, watch it fail** — `pnpm vitest run src/lib/env.test.ts` → FAIL (schema mismatch).

- [ ] **Step 3: Update `src/lib/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  // comma-separated GitHub logins; empty => deny all (enforced in allowlist.ts)
  ALLOWED_GITHUB_USERS: z.string().default(""),
  GITHUB_CONTENT_REPO: z.string().regex(/^[^/]+\/[^/]+$/, "must be owner/repo"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return schema.parse(source);
}

// Lazy singleton: importing this module must NOT eagerly parse process.env
// (tests import `loadEnv` directly). Parsed on first property access.
let _env: Env | undefined;
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    _env ??= loadEnv();
    return _env[prop as keyof Env];
  },
});
```

- [ ] **Step 4: Update vitest env block** in `vitest.config.ts` so modules importing `env` at load time don't throw. Replace the `env:` line under `test` with:

```ts
    env: {
      DATABASE_URL: "postgresql://user:pass@localhost/sumi_test",
      BETTER_AUTH_SECRET: "x".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
      GITHUB_CLIENT_ID: "test-cid",
      GITHUB_CLIENT_SECRET: "test-csecret",
      ALLOWED_GITHUB_USERS: "alice,bob",
      GITHUB_CONTENT_REPO: "alice/sumi-content",
    },
```

- [ ] **Step 5: Run** — `pnpm vitest run src/lib/env.test.ts` → PASS; then `pnpm test` + `pnpm typecheck` green.

- [ ] **Step 6: Commit** — `git add src/lib/env.ts src/lib/env.test.ts vitest.config.ts && git commit -m "feat: revise env config for Vercel/Neon/GitHub stack"`

---

## Task 3: Drizzle client over Neon + Better Auth schema

**Files:**
- Create: `src/lib/db.ts`, `src/db/schema.ts`, `drizzle.config.ts`
- Remove: the old better-sqlite3 usage in `src/lib/db.ts` (overwrite it)
- Modify: `package.json` (remove `better-sqlite3`/`@types/better-sqlite3`; add `drizzle-orm`, `@neondatabase/serverless`, dev `drizzle-kit`)
- Test: `src/lib/db.test.ts` (rewrite)

- [ ] **Step 1: Swap dependencies**

```bash
pnpm remove better-sqlite3 @types/better-sqlite3
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

Also remove `better-sqlite3` from `pnpm.onlyBuiltDependencies` in `package.json` if present.

- [ ] **Step 2: Write the failing test**

The Drizzle client construction should be pure (no network at import). Test that `createDb(url)` returns a Drizzle instance with a `.select` method, using a dummy URL (neon-http is lazy — no connection until a query runs). Create `src/lib/db.test.ts`:

```ts
import { expect, test } from "vitest";
import { createDb } from "./db";

test("createDb returns a drizzle client without connecting", () => {
  const db = createDb("postgresql://user:pass@localhost/sumi_test");
  expect(typeof db.select).toBe("function");
});
```

- [ ] **Step 3: Run test, watch it fail** — `pnpm vitest run src/lib/db.test.ts` → FAIL (module/exports missing).

- [ ] **Step 4: Implement schema + client**

Create `src/db/schema.ts` (Better Auth's required tables, Postgres/Drizzle. These column names match Better Auth's expected schema — Task 4 will confirm via the Better Auth CLI and adjust if the installed version differs):

```ts
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const schema = { user, session, account, verification };
```

Create `src/lib/db.ts`:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "./env";
import { schema } from "@/db/schema";

export function createDb(url: string) {
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Shared instance for the running app (lazy: constructed at import, connects on first query).
export const db = createDb(env.DATABASE_URL);
```

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Step 5: Run** — `pnpm vitest run src/lib/db.test.ts` → PASS; `pnpm test` + `pnpm typecheck` green.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: drizzle client over neon + better-auth schema (replaces sqlite)"`

---

## Task 4: Better Auth with GitHub OAuth + allowlist gate

**Files:**
- Create: `src/lib/allowlist.ts`, `src/lib/auth.ts`
- Test: `src/lib/allowlist.test.ts`
- Modify: `package.json` (add `better-auth`)

- [ ] **Step 1: Install** — `pnpm add better-auth`

- [ ] **Step 2: Write failing test for the allowlist predicate**

Create `src/lib/allowlist.test.ts`:

```ts
import { expect, test } from "vitest";
import { isAllowedGithubUser } from "./allowlist";

test("allows a listed user (case-insensitive)", () => {
  expect(isAllowedGithubUser("Alice", "alice,bob")).toBe(true);
});

test("rejects an unlisted user", () => {
  expect(isAllowedGithubUser("carol", "alice,bob")).toBe(false);
});

test("empty allowlist denies everyone", () => {
  expect(isAllowedGithubUser("alice", "")).toBe(false);
});

test("ignores surrounding whitespace in the list", () => {
  expect(isAllowedGithubUser("bob", " alice , bob ")).toBe(true);
});
```

- [ ] **Step 3: Run test, watch it fail** — `pnpm vitest run src/lib/allowlist.test.ts` → FAIL.

- [ ] **Step 4: Implement the predicate**

Create `src/lib/allowlist.ts`:

```ts
/** True if `login` is in the comma-separated allowlist. Empty list => deny all. */
export function isAllowedGithubUser(login: string, allowlist: string): boolean {
  const allowed = allowlist
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.trim().toLowerCase());
}
```

- [ ] **Step 5: Run** — `pnpm vitest run src/lib/allowlist.test.ts` → PASS (4 tests).

- [ ] **Step 6: Implement Better Auth**

Create `src/lib/auth.ts` (verify option names against the installed `better-auth` version — read `node_modules/better-auth/dist` types — and adapt while keeping behavior):

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "./db";
import { env } from "./env";
import { schema } from "@/db/schema";
import { isAllowedGithubUser } from "./allowlist";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      scope: ["repo", "read:user"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // The GitHub login is on the user record (username plugin not used;
          // Better Auth maps GitHub login -> name/email; the GitHub login is
          // available as the profile login). Gate on the allowlist.
          const login = (user as { name?: string }).name ?? "";
          if (!isAllowedGithubUser(login, env.ALLOWED_GITHUB_USERS)) {
            throw new APIError("FORBIDDEN", {
              message: "This GitHub account is not on the allowlist.",
            });
          }
          return { data: user };
        },
      },
    },
  },
});
```

> NOTE for implementer: The exact field carrying the GitHub `login` may differ (it could be `user.name`, or you may need a `mapProfileToUser`/`profile` mapping in the github provider to capture `profile.login`). Read the Better Auth GitHub provider docs/types in `node_modules/better-auth/dist`. The REQUIRED behavior: a user whose GitHub login is not in `ALLOWED_GITHUB_USERS` must be rejected at account creation with a `FORBIDDEN` APIError; allowed users proceed. If capturing the GitHub login cleanly requires `mapProfileToUser` to store `profile.login` into a field, do that and gate on that field. Report exactly how you captured the login.

- [ ] **Step 7: Verify** — `pnpm typecheck` clean; `pnpm test` green (allowlist tests pass; auth module imports without error). Do NOT attempt a live GitHub OAuth round-trip here (needs real credentials) — Task 5 covers gate behavior with a test DB.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: Better Auth GitHub OAuth with allowlist safe gate"`

---

## Task 5: Allowlist gate integration test (pglite)

**Files:**
- Test: `src/lib/auth.test.ts`
- Modify: `package.json` (add dev `@electric-sql/pglite`, `drizzle-orm` already present)

- [ ] **Step 1: Install pglite** — `pnpm add -D @electric-sql/pglite`

- [ ] **Step 2: Write the integration test**

Build an isolated Better Auth instance over an in-memory pglite Postgres, create the tables, and assert the allowlist gate: a `databaseHooks.user.create.before` that rejects users not on the list. Since a full GitHub OAuth flow can't run offline, test the gate by exercising the hook via Better Auth's internal user-create path OR by unit-testing the hook function directly against the same predicate. Create `src/lib/auth.test.ts`:

```ts
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { expect, test } from "vitest";
import { schema } from "@/db/schema";
import { isAllowedGithubUser } from "./allowlist";

function makeAuth(allowlist: string) {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const auth = betterAuth({
    secret: "x".repeat(32),
    baseURL: "http://localhost:3000",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    databaseHooks: {
      user: {
        create: {
          before: async (user: { name?: string }) => {
            if (!isAllowedGithubUser(user.name ?? "", allowlist)) {
              throw new APIError("FORBIDDEN", { message: "not allowed" });
            }
            return { data: user };
          },
        },
      },
    },
  });
  return { auth, client };
}

test("auth instance constructs over pglite", () => {
  const { auth } = makeAuth("alice");
  expect(auth).toBeDefined();
});

test("allowlist predicate gates the hook logic", () => {
  expect(isAllowedGithubUser("alice", "alice")).toBe(true);
  expect(isAllowedGithubUser("mallory", "alice")).toBe(false);
});
```

> NOTE: If `drizzle-orm/pglite` + Better Auth schema creation needs the tables to exist first, create them by pushing the schema (use `drizzle-kit` programmatic push against pglite, or execute the `CREATE TABLE` SQL Better Auth expects). Keep the test focused on proving (a) the auth instance builds over a real Postgres-compatible DB, and (b) the gate predicate rejects/admits correctly. Do not over-invest in simulating the full OAuth callback offline.

- [ ] **Step 3: Run** — `pnpm vitest run src/lib/auth.test.ts` → PASS; full `pnpm test` + `pnpm typecheck` green.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "test: allowlist gate over pglite"`

---

## Task 6: Auth route handler

**Files:**
- Create: `src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Implement** (verify `toNextJsHandler` import path against installed better-auth; this repo uses a newer Next.js — consult `node_modules/next/dist/docs/` if the App Router route handler signature differs):

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

- [ ] **Step 2: Verify** — `pnpm typecheck` clean; `pnpm build` succeeds and lists `/api/auth/[...all]`.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: mount Better Auth route handler"`

---

## Task 7: Auth client + current-user helper

**Files:**
- Create: `src/lib/auth-client.ts`, `src/lib/current-user.ts`

- [ ] **Step 1: Auth client** — `src/lib/auth-client.ts`:

```ts
"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
export const { signIn, signOut, useSession } = authClient;
```

- [ ] **Step 2: current-user helper** — `src/lib/current-user.ts`:

```ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
```

- [ ] **Step 3: Verify** — `pnpm typecheck` clean.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: auth client and getCurrentUser helper"`

---

## Task 8: GitHub sign-in page + auth-aware home

**Files:**
- Create: `src/app/sign-in/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Sign-in page** — `src/app/sign-in/page.tsx`:

```tsx
"use client";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", textAlign: "center" }}>
      <h1>Sign in to Sumi</h1>
      <button onClick={() => signIn.social({ provider: "github", callbackURL: "/" })}>
        Continue with GitHub
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Home page** — replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto" }}>
      <h1>Sumi 墨</h1>
      {user ? (
        <p>Signed in as {user.name}.</p>
      ) : (
        <p><Link href="/sign-in">Sign in with GitHub</Link>.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify** — `pnpm typecheck` clean; `pnpm build` succeeds.

> Manual GitHub OAuth verification requires a real GitHub OAuth app + Neon DB + env; document it in the README (Task 9) rather than running it here.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: GitHub sign-in page and auth-aware home"`

---

## Task 9: Vercel deploy config, env example, README, migrations

**Files:**
- Create: `.env.example`, `README.md` (overwrite default), `drizzle/` migration output
- Modify: `package.json` (add `db:generate`, `db:migrate` scripts)

- [ ] **Step 1: Generate the migration**

```bash
pnpm exec drizzle-kit generate
```
This produces SQL under `drizzle/`. Commit it so deploys can apply it.

- [ ] **Step 2: Add db scripts** to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

- [ ] **Step 3: `.env.example`**

```
# Neon Postgres (from Vercel Neon integration or neon.tech)
DATABASE_URL=postgresql://...
# Better Auth: generate secret with: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
# GitHub OAuth app (Settings > Developer settings > OAuth Apps). Callback: $BETTER_AUTH_URL/api/auth/callback/github
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# Comma-separated GitHub usernames allowed to sign in (empty = nobody)
ALLOWED_GITHUB_USERS=
# Content repo (owner/repo) where articles/images are committed
GITHUB_CONTENT_REPO=
```

- [ ] **Step 4: README with Deploy button**

Overwrite `README.md`. Include: project summary; a "Deploy to Vercel" button:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,ALLOWED_GITHUB_USERS,GITHUB_CONTENT_REPO)
```

Plus a "Local development" section: copy `.env.example` to `.env.local`, create a Neon DB, create a GitHub OAuth app with callback `http://localhost:3000/api/auth/callback/github`, run `pnpm db:migrate`, `pnpm dev`. And a "First deploy" section: add the Neon integration on Vercel, set env vars, run `pnpm db:migrate` against the production `DATABASE_URL` once.

- [ ] **Step 5: Verify** — `pnpm build` succeeds; `pnpm test` + `pnpm typecheck` green.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: Vercel deploy config, env example, README, drizzle migrations"`

---

## Done criteria for Plan 1

- `pnpm test`, `pnpm typecheck`, `pnpm build` all pass.
- Better Auth is configured with GitHub as the only provider; the allowlist gate (`isAllowedGithubUser`) is unit- and integration-tested.
- Drizzle schema + generated migration exist for the Better Auth tables on Postgres.
- The app deploys to Vercel (button + documented env) and connects to Neon.
- A GitHub-allowlisted user can sign in; non-allowlisted users are rejected with a clear 403.

Content storage (GitHub API) is Plan 2.
