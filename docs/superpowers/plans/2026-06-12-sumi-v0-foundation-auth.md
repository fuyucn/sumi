# Sumi v0 — Plan 1: Foundation + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Sumi Next.js app with tooling and a working multi-creator account system (register / log in / `@handle`), gated by an instance signup mode, runnable via Docker.

**Architecture:** A single Next.js (App Router, TypeScript) application. Authentication and account data live in a local SQLite file managed by Better Auth (username plugin provides the unique `@handle`). No external database container. Signup mode (`open | invite | closed`) is enforced via env config and a Better Auth hook.

**Tech Stack:** Next.js (App Router) · TypeScript · pnpm · Vitest · Better Auth · better-sqlite3 · Docker / docker-compose

**Git policy for this project:** commits are **local only** — never `git push`, never configure a remote. If the local signing agent errors on commit, run commits with `git -c commit.gpgsign=false commit ...`.

---

## File Structure

Created/owned by this plan (paths relative to repo root `~/Developer/sumi`):

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `.gitignore` — project + tooling
- `vitest.config.ts` — test runner config
- `src/lib/env.ts` — typed environment config (incl. `SIGNUPS` mode)
- `src/lib/db.ts` — better-sqlite3 connection (single shared instance)
- `src/lib/auth.ts` — Better Auth server instance (emailAndPassword + username + signup gate)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/lib/current-user.ts` — `getCurrentUser()` server helper
- `src/app/api/auth/[...all]/route.ts` — mounts Better Auth handler
- `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/sign-in/page.tsx` — minimal auth UI
- `src/app/page.tsx` — placeholder home showing auth state
- `Dockerfile`, `docker-compose.yml`, `.dockerignore` — deployment
- Tests under `src/**/*.test.ts` colocated with the unit under test

---

## Task 1: Project scaffolding & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `src/app/page.tsx`, `src/app/layout.tsx`

- [ ] **Step 1: Scaffold Next.js app into the repo root**

Run (the repo already contains `docs/`; scaffold in place):

```bash
cd ~/Developer/sumi
pnpm dlx create-next-app@latest . \
  --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*" \
  --use-pnpm --skip-install --yes
pnpm install
```

If `create-next-app` refuses because the directory is non-empty, scaffold in a temp dir and move files:

```bash
pnpm dlx create-next-app@latest /tmp/sumi-scaffold --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-pnpm --skip-install --yes
cp -R /tmp/sumi-scaffold/. ~/Developer/sumi/
rm -rf /tmp/sumi-scaffold
cd ~/Developer/sumi && pnpm install
```

- [ ] **Step 2: Add Vitest and test/type scripts**

Run:

```bash
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

Edit `package.json` `"scripts"` to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Add a trivial sanity test**

Create `src/lib/sanity.test.ts`:

```ts
import { expect, test } from "vitest";

test("test harness runs", () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Verify tooling runs**

Run: `pnpm test`
Expected: 1 passed.

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Ensure data dir is git-ignored**

Append to `.gitignore`:

```
# Sumi local data
/data/
*.db
*.db-journal
```

- [ ] **Step 6: Commit (local)**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest tooling"
```

---

## Task 2: Typed environment config

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/env.test.ts`:

```ts
import { afterEach, beforeEach, expect, test } from "vitest";
import { loadEnv } from "./env";

const base = {
  BETTER_AUTH_SECRET: "x".repeat(32),
  DATABASE_FILE: "./data/sumi.db",
};

test("defaults SIGNUPS to 'open'", () => {
  const env = loadEnv({ ...base });
  expect(env.SIGNUPS).toBe("open");
});

test("accepts valid SIGNUPS values", () => {
  expect(loadEnv({ ...base, SIGNUPS: "closed" }).SIGNUPS).toBe("closed");
  expect(loadEnv({ ...base, SIGNUPS: "invite" }).SIGNUPS).toBe("invite");
});

test("rejects invalid SIGNUPS value", () => {
  expect(() => loadEnv({ ...base, SIGNUPS: "nope" })).toThrow();
});

test("requires a secret of at least 32 chars", () => {
  expect(() => loadEnv({ ...base, BETTER_AUTH_SECRET: "short" })).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/env.test.ts`
Expected: FAIL — cannot find module `./env`.

- [ ] **Step 3: Add zod and implement env loader**

Run: `pnpm add zod`

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const schema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_FILE: z.string().min(1).default("./data/sumi.db"),
  SIGNUPS: z.enum(["open", "invite", "closed"]).default("open"),
  INVITE_CODE: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return schema.parse(source);
}

export const env = loadEnv();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/env.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit (local)**

```bash
git add src/lib/env.ts src/lib/env.test.ts package.json pnpm-lock.yaml
git commit -m "feat: typed env config with SIGNUPS mode"
```

---

## Task 3: SQLite connection module

**Files:**
- Create: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/db.test.ts`:

```ts
import { expect, test } from "vitest";
import { createDb } from "./db";

test("createDb opens an in-memory db and runs a query", () => {
  const db = createDb(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
  db.prepare("INSERT INTO t (v) VALUES (?)").run("hi");
  const row = db.prepare("SELECT v FROM t WHERE id = 1").get() as { v: string };
  expect(row.v).toBe("hi");
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/db.test.ts`
Expected: FAIL — cannot find module `./db`.

- [ ] **Step 3: Add better-sqlite3 and implement**

Run: `pnpm add better-sqlite3 && pnpm add -D @types/better-sqlite3`

Create `src/lib/db.ts`:

```ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "./env";

export function createDb(file: string) {
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  return db;
}

// Single shared instance for the running app.
export const db = createDb(env.DATABASE_FILE);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/db.test.ts`
Expected: PASS.

> Note: importing `./db` pulls in `./env`, which requires `BETTER_AUTH_SECRET`. Set test env in `vitest.config.ts` by adding under `test`: `env: { BETTER_AUTH_SECRET: "x".repeat(32) }`. Apply that edit now and re-run to confirm green.

- [ ] **Step 5: Commit (local)**

```bash
git add src/lib/db.ts src/lib/db.test.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: sqlite connection module"
```

---

## Task 4: Better Auth server instance

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Install Better Auth**

Run: `pnpm add better-auth`

- [ ] **Step 2: Implement the auth instance**

Create `src/lib/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { db } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: db,
  emailAndPassword: {
    enabled: true,
    // 'closed' fully disables self-signup; 'open'/'invite' allow the call
    // through and the invite code is enforced in the hook below.
    disableSignUp: env.SIGNUPS === "closed",
  },
  plugins: [username()],
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (env.SIGNUPS !== "invite") return { data: user };
          const code = ctx?.body?.inviteCode;
          if (!code || code !== env.INVITE_CODE) {
            throw new Error("A valid invite code is required to sign up.");
          }
          return { data: user };
        },
      },
    },
  },
});
```

- [ ] **Step 3: Verify it typechecks and the schema generates**

Run: `pnpm typecheck`
Expected: no errors.

Run: `BETTER_AUTH_SECRET=$(node -e "console.log('x'.repeat(32))") DATABASE_FILE=./data/sumi.db pnpm dlx @better-auth/cli@latest migrate -y`
Expected: creates auth tables (user, account, session, verification) in `./data/sumi.db`. The command prints the tables it created.

- [ ] **Step 4: Commit (local)**

```bash
git add src/lib/auth.ts package.json pnpm-lock.yaml
git commit -m "feat: Better Auth server with username plugin and signup gate"
```

---

## Task 5: Signup gate behavior (integration test)

**Files:**
- Test: `src/lib/auth.test.ts`

- [ ] **Step 1: Write the failing test**

This test builds isolated auth instances against in-memory DBs to assert gating. Create `src/lib/auth.test.ts`:

```ts
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { expect, test } from "vitest";
import { createDb } from "./db";

function makeAuth(signups: "open" | "invite" | "closed", inviteCode?: string) {
  const db = createDb(":memory:");
  const auth = betterAuth({
    secret: "x".repeat(32),
    database: db,
    emailAndPassword: { enabled: true, disableSignUp: signups === "closed" },
    plugins: [username()],
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, ctx: any) => {
            if (signups !== "invite") return { data: user };
            if (!ctx?.body?.inviteCode || ctx.body.inviteCode !== inviteCode) {
              throw new Error("A valid invite code is required to sign up.");
            }
            return { data: user };
          },
        },
      },
    },
  });
  return { auth, db };
}

async function signUp(auth: ReturnType<typeof betterAuth>, body: Record<string, unknown>) {
  return auth.api.signUpEmail({ body: body as any, asResponse: true });
}

test("open mode allows signup", async () => {
  const { auth } = makeAuth("open");
  const res = await signUp(auth, {
    email: "a@example.com", password: "password123", name: "A", username: "alice",
  });
  expect(res.status).toBe(200);
});

test("closed mode rejects signup", async () => {
  const { auth } = makeAuth("closed");
  const res = await signUp(auth, {
    email: "b@example.com", password: "password123", name: "B", username: "bob",
  });
  expect(res.status).toBeGreaterThanOrEqual(400);
});

test("invite mode rejects without correct code", async () => {
  const { auth } = makeAuth("invite", "secret");
  const res = await signUp(auth, {
    email: "c@example.com", password: "password123", name: "C", username: "carol",
  });
  expect(res.status).toBeGreaterThanOrEqual(400);
});

test("invite mode accepts with correct code", async () => {
  const { auth } = makeAuth("invite", "secret");
  const res = await signUp(auth, {
    email: "d@example.com", password: "password123", name: "D", username: "dave",
    inviteCode: "secret",
  });
  expect(res.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails first / drives behavior**

Run: `pnpm vitest run src/lib/auth.test.ts`
Expected: Tables may not exist on the in-memory db. Better Auth needs its schema. If tests fail because tables are missing, add a `before* migration step: in `makeAuth`, after creating `db`, run the Better Auth SQL by calling the Kysely-based migrator. Simplest reliable approach: create the four tables explicitly in the test helper.

Add this helper and call it inside `makeAuth` right after `createDb`:

```ts
function migrate(db: ReturnType<typeof createDb>) {
  db.exec(`
    CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, emailVerified INTEGER,
      image TEXT, username TEXT UNIQUE, displayUsername TEXT, createdAt TEXT, updatedAt TEXT);
    CREATE TABLE "session" (id TEXT PRIMARY KEY, expiresAt TEXT, token TEXT UNIQUE, createdAt TEXT,
      updatedAt TEXT, ipAddress TEXT, userAgent TEXT, userId TEXT);
    CREATE TABLE "account" (id TEXT PRIMARY KEY, accountId TEXT, providerId TEXT, userId TEXT,
      accessToken TEXT, refreshToken TEXT, idToken TEXT, accessTokenExpiresAt TEXT,
      refreshTokenExpiresAt TEXT, scope TEXT, password TEXT, createdAt TEXT, updatedAt TEXT);
    CREATE TABLE "verification" (id TEXT PRIMARY KEY, identifier TEXT, value TEXT, expiresAt TEXT,
      createdAt TEXT, updatedAt TEXT);
  `);
}
```

> If a future Better Auth version changes column names, regenerate the canonical schema with `pnpm dlx @better-auth/cli@latest generate` and copy the columns. Keep this helper in sync.

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm vitest run src/lib/auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit (local)**

```bash
git add src/lib/auth.test.ts
git commit -m "test: signup gating for open/invite/closed modes"
```

---

## Task 6: Auth route handler

**Files:**
- Create: `src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Implement the handler**

Create `src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

- [ ] **Step 2: Verify build picks up the route**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds and lists `/api/auth/[...all]` as a route.

- [ ] **Step 3: Commit (local)**

```bash
git add "src/app/api/auth/[...all]/route.ts"
git commit -m "feat: mount Better Auth route handler"
```

---

## Task 7: Auth client + current-user helper

**Files:**
- Create: `src/lib/auth-client.ts`, `src/lib/current-user.ts`

- [ ] **Step 1: Implement the React client**

Create `src/lib/auth-client.ts`:

```ts
"use client";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 2: Implement the server-side current-user helper**

Create `src/lib/current-user.ts`:

```ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit (local)**

```bash
git add src/lib/auth-client.ts src/lib/current-user.ts
git commit -m "feat: auth client and getCurrentUser helper"
```

---

## Task 8: Minimal auth pages + home

**Files:**
- Create: `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Sign-up page**

Create `src/app/(auth)/sign-up/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await signUp.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
      name: String(f.get("displayName")),
      username: String(f.get("handle")),
      // inviteCode is ignored by the server unless SIGNUPS=invite
      // @ts-expect-error custom field passed through to the create hook
      inviteCode: String(f.get("inviteCode") ?? ""),
    });
    if (res.error) return setError(res.error.message ?? "Sign up failed");
    router.push("/");
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 360, margin: "4rem auto", display: "grid", gap: 8 }}>
      <h1>Create your account</h1>
      <input name="displayName" placeholder="Display name" required />
      <input name="handle" placeholder="handle (e.g. alice)" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password (min 8)" required minLength={8} />
      <input name="inviteCode" placeholder="Invite code (if required)" />
      <button type="submit">Sign up</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Sign-in page**

Create `src/app/(auth)/sign-in/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (res.error) return setError(res.error.message ?? "Sign in failed");
    router.push("/");
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 360, margin: "4rem auto", display: "grid", gap: 8 }}>
      <h1>Sign in</h1>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign in</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Home page shows auth state**

Replace `src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto" }}>
      <h1>Sumi 墨</h1>
      {user ? (
        <p>Signed in as @{(user as { username?: string }).username ?? user.name}.</p>
      ) : (
        <p>
          <Link href="/sign-in">Sign in</Link> or <Link href="/sign-up">Sign up</Link>.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Manual verification of the full auth loop**

Run (in one shell):

```bash
BETTER_AUTH_SECRET=$(node -e "console.log('x'.repeat(32))") DATABASE_FILE=./data/sumi.db SIGNUPS=open pnpm dev
```

In a browser: open `http://localhost:3000/sign-up`, register `alice`, confirm redirect to `/` shows "Signed in as @alice." Then verify `/sign-in` works after signing out (sign-out wiring is a later UI task; for now confirm session via reload).
Expected: account persists in `./data/sumi.db`.

- [ ] **Step 5: Commit (local)**

```bash
git add "src/app/(auth)" src/app/page.tsx
git commit -m "feat: minimal sign-up/sign-in pages and auth-aware home"
```

---

## Task 9: Docker & compose for v0

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.example`

- [ ] **Step 1: Enable standalone output**

Edit `next.config.ts` to set `output: "standalone"`:

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone" };
export default nextConfig;
```

- [ ] **Step 2: Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
data
.git
docs
```

- [ ] **Step 4: docker-compose.yml**

Create `docker-compose.yml` (single service, persistent volume for the sqlite file):

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?set a 32+ char secret}
      DATABASE_FILE: /app/data/sumi.db
      SIGNUPS: ${SIGNUPS:-open}
      INVITE_CODE: ${INVITE_CODE:-}
    volumes:
      - sumi-data:/app/data

volumes:
  sumi-data:
```

- [ ] **Step 5: .env.example**

Create `.env.example`:

```
# Generate with: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
BETTER_AUTH_SECRET=
DATABASE_FILE=./data/sumi.db
SIGNUPS=open
INVITE_CODE=
```

- [ ] **Step 6: Verify the image builds and runs**

Run:

```bash
export BETTER_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
docker compose build
docker compose up -d
```

> The Better Auth tables must exist in the mounted volume. Run the migration once against the container's db before first use:
> `docker compose exec app sh -c "DATABASE_FILE=/app/data/sumi.db pnpm dlx @better-auth/cli@latest migrate -y"`
> (Add this as a documented first-run step; a later plan automates it via an entrypoint.)

Open `http://localhost:3000` — expect the Sumi home page. Sign up; confirm it persists across `docker compose restart`.

- [ ] **Step 7: Commit (local)**

```bash
git add Dockerfile .dockerignore docker-compose.yml .env.example next.config.ts
git commit -m "feat: Docker and compose for single-container v0 deploy"
```

---

## Done criteria for Plan 1

- `pnpm test`, `pnpm typecheck`, `pnpm build` all pass.
- A user can register with a unique `@handle`, log in, and the home page reflects session state.
- `SIGNUPS=open|invite|closed` is enforced (covered by tests).
- `docker compose up` serves the app with a persistent SQLite volume.

These outputs are the foundation Plan 2 (Content engine) builds on.
```
