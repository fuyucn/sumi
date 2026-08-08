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

test("fails fast when the allowlist is empty in production", () => {
  expect(() =>
    loadEnv({ ...base, ALLOWED_GITHUB_USERS: "", NODE_ENV: "production" }),
  ).toThrow(/ALLOWED_GITHUB_USERS/);
});

test("allows an empty allowlist outside production (deny-all dev default)", () => {
  const env = loadEnv({ ...base, ALLOWED_GITHUB_USERS: "", NODE_ENV: "development" });
  expect(env.ALLOWED_GITHUB_USERS).toBe("");
});

test("treats an empty CF_ENABLED as unset (optional)", () => {
  const env = loadEnv({ ...base, CF_ENABLED: "" });
  expect(env.CF_ENABLED).toBeUndefined();
});

test("keeps CF_ENABLED when set", () => {
  const env = loadEnv({ ...base, CF_ENABLED: "1" });
  expect(env.CF_ENABLED).toBe("1");
});

test("parses trusted origins as a comma-separated optional string", () => {
  const env = loadEnv({ ...base, BETTER_AUTH_TRUSTED_ORIGINS: "https://a.example, https://b.example," });
  expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toBe("https://a.example, https://b.example,");
});

test("defaults trusted origins to empty", () => {
  const env = loadEnv(base);
  expect(env.BETTER_AUTH_TRUSTED_ORIGINS).toBe("");
});

test("treats an empty LOGIN_PASSPHRASE as unset (optional)", () => {
  const env = loadEnv({ ...base, LOGIN_PASSPHRASE: "" });
  expect(env.LOGIN_PASSPHRASE).toBeUndefined();
});

test("keeps LOGIN_PASSPHRASE when set", () => {
  const env = loadEnv({ ...base, LOGIN_PASSPHRASE: "s3cret" });
  expect(env.LOGIN_PASSPHRASE).toBe("s3cret");
});
