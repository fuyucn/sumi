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
