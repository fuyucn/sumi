import { beforeEach, expect, test } from "vitest";
import { rateLimit } from "./rate-limit";

beforeEach(() => {
  // Fresh state per test (module is re-imported by vitest isolation, but be safe).
  // rateLimit uses a module-scoped Map; use unique keys per test instead.
});

test("allows up to the limit, then blocks within the window", () => {
  const key = `t1-${Math.random()}`;
  const cfg = { limit: 3, windowMs: 60_000 };
  expect(rateLimit(key, cfg).allowed).toBe(true);
  expect(rateLimit(key, cfg).allowed).toBe(true);
  expect(rateLimit(key, cfg).allowed).toBe(true);
  const r = rateLimit(key, cfg);
  expect(r.allowed).toBe(false);
  expect(r.remaining).toBe(0);
});

test("independent keys have independent budgets", () => {
  const keyA = `tA-${Math.random()}`;
  const keyB = `tB-${Math.random()}`;
  const cfg = { limit: 1, windowMs: 60_000 };
  expect(rateLimit(keyA, cfg).allowed).toBe(true);
  expect(rateLimit(keyA, cfg).allowed).toBe(false);
  expect(rateLimit(keyB, cfg).allowed).toBe(true);
});

test("reports remaining budget", () => {
  const key = `t3-${Math.random()}`;
  const cfg = { limit: 5, windowMs: 60_000 };
  expect(rateLimit(key, cfg).remaining).toBe(4);
  expect(rateLimit(key, cfg).remaining).toBe(3);
});