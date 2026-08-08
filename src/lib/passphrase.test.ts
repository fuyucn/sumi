import { expect, test } from "vitest";
import {
  hasValidPassphraseCookie,
  passphraseMatches,
  passphraseToken,
  verifyPassphraseToken,
} from "./passphrase";

const SECRET = "x".repeat(32);

test("passphraseMatches compares constant-time and rejects wrong input", () => {
  expect(passphraseMatches("correct horse", "correct horse", SECRET)).toBe(true);
  expect(passphraseMatches("battery staple", "correct horse", SECRET)).toBe(false);
  expect(passphraseMatches("", "correct horse", SECRET)).toBe(false);
});

test("owner token round-trips and fails for the wrong secret or token", () => {
  const token = passphraseToken("correct horse", SECRET);
  expect(verifyPassphraseToken(token, "correct horse", SECRET)).toBe(true);
  expect(verifyPassphraseToken(token, "wrong", SECRET)).toBe(false);
  expect(verifyPassphraseToken(token, "correct horse", "y".repeat(32))).toBe(false);
  expect(verifyPassphraseToken("forged:value", "correct horse", SECRET)).toBe(false);
});

test("hasValidPassphraseCookie finds the owner cookie among others", () => {
  const token = encodeURIComponent(passphraseToken("correct horse", SECRET));
  const cookies = `session=abc; ${"sumi_owner"}=${token}; theme=dark`;
  expect(hasValidPassphraseCookie(cookies, "correct horse", SECRET)).toBe(true);
  expect(hasValidPassphraseCookie(cookies, "wrong", SECRET)).toBe(false);
  expect(hasValidPassphraseCookie(null, "correct horse", SECRET)).toBe(false);
  expect(hasValidPassphraseCookie("session=abc", "correct horse", SECRET)).toBe(false);
});

test("malformed owner cookie values are ignored, not thrown", () => {
  expect(hasValidPassphraseCookie(`sumi_owner=%zz; sumi_owner=${encodeURIComponent(passphraseToken("correct horse", SECRET))}`, "correct horse", SECRET)).toBe(true);
  expect(hasValidPassphraseCookie("sumi_owner=%zz", "correct horse", SECRET)).toBe(false);
});
