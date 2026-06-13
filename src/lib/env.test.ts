import { expect, test } from "vitest";
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
