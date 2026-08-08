import { expect, test } from "vitest";
import { loadEnv } from "./env";

const base = {
  DATABASE_URL: "postgresql://user:pass@host/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "cid",
  GITHUB_CLIENT_SECRET: "csecret",
  ALLOWED_GITHUB_USERS: "alice,bob",
};

test("parses a full valid env", () => {
  const env = loadEnv({ ...base });
  expect(env.DATABASE_URL).toContain("postgresql://");
  expect(env.ALLOWED_GITHUB_USERS).toBe("alice,bob");
});

test("requires DATABASE_URL", () => {
  const rest: Partial<typeof base> = { ...base };
  delete rest.DATABASE_URL;
  expect(() => loadEnv(rest)).toThrow();
});

test("requires a secret of at least 32 chars", () => {
  expect(() => loadEnv({ ...base, BETTER_AUTH_SECRET: "short" })).toThrow();
});

test("requires GITHUB_CLIENT_ID and SECRET", () => {
  const rest: Partial<typeof base> = { ...base };
  delete rest.GITHUB_CLIENT_ID;
  expect(() => loadEnv(rest)).toThrow();
});

test("treats an empty CF_ENABLED as unset (optional)", () => {
  const env = loadEnv({ ...base, CF_ENABLED: "" });
  expect(env.CF_ENABLED).toBeUndefined();
});

test("keeps CF_ENABLED when set", () => {
  const env = loadEnv({ ...base, CF_ENABLED: "1" });
  expect(env.CF_ENABLED).toBe("1");
});
