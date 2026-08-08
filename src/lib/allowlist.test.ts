import { expect, test } from "vitest";
import { isAllowedGithubUser, isSessionUserAllowed } from "./allowlist";

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

test("isSessionUserAllowed re-checks the allowlist per request", () => {
  const allowlist = "alice";
  expect(isSessionUserAllowed({ username: "alice" }, allowlist)).toBe(true);
  expect(isSessionUserAllowed({ username: "ALICE" }, allowlist)).toBe(true);
  expect(isSessionUserAllowed({ username: "intruder" }, allowlist)).toBe(false);
  expect(isSessionUserAllowed({ username: null }, allowlist)).toBe(false);
  expect(isSessionUserAllowed(null, allowlist)).toBe(false);
});
