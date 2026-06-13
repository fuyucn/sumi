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
