import { expect, test } from "vitest";
import { slugify, postDir, postFile, imagePath, userDir, CONTENT_DIR } from "./paths";

test("slugify lowercases, trims, replaces spaces and strips punctuation", () => {
  expect(slugify("Hello World!")).toBe("hello-world");
  expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  expect(slugify("Café & Crème")).toBe("cafe-creme");
});

test("slugify keeps unicode letters (e.g. Japanese)", () => {
  expect(slugify("こんにちは 世界")).toBe("こんにちは-世界");
});

test("slugify falls back to 'post' for empty result", () => {
  expect(slugify("!!!")).toBe("post");
});

test("path builders compose the content layout", () => {
  expect(CONTENT_DIR).toBe("content");
  expect(userDir("alice")).toBe("content/@alice");
  expect(postDir("alice", "hello")).toBe("content/@alice/hello");
  expect(postFile("alice", "hello")).toBe("content/@alice/hello/index.md");
  expect(imagePath("alice", "hello", "cover.png")).toBe("content/@alice/hello/images/cover.png");
});
