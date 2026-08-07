import { expect, test } from "vitest";
import { slugify, postDir, postFile, imagePath, userDir, CONTENT_DIR, safeImageName, notesDir, noteFile, friendsFile, safeNoteName } from "./paths";

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

test("safeImageName lowercases and slugifies base, preserves extension", () => {
  expect(safeImageName("My Photo.PNG")).toBe("my-photo.png");
  expect(safeImageName("hello-world.jpg")).toBe("hello-world.jpg");
  expect(safeImageName("Café Image.jpeg")).toBe("cafe-image.jpeg");
});

test("safeImageName falls back to 'image' when base name is empty or only symbols", () => {
  expect(safeImageName(".png")).toBe("image.png");
  expect(safeImageName("!!.gif")).toBe("image.gif");
});

test("safeImageName handles filenames with no extension", () => {
  expect(safeImageName("myfile")).toBe("myfile");
  expect(safeImageName("My File")).toBe("my-file");
});

test("path builders compose the content layout", () => {
  expect(CONTENT_DIR).toBe("content");
  expect(userDir("alice")).toBe("content/@alice");
  expect(postDir("alice", "hello")).toBe("content/@alice/hello");
  expect(postFile("alice", "hello")).toBe("content/@alice/hello/index.md");
  expect(imagePath("alice", "hello", "cover.png")).toBe("content/@alice/hello/images/cover.png");
  expect(notesDir("alice")).toBe("content/@alice/notes");
  expect(noteFile("alice", "2026-01-01T00-00-00-000Z-alice")).toBe("content/@alice/notes/2026-01-01T00-00-00-000Z-alice.md");
  expect(friendsFile()).toBe("content/friends.json");
  expect(safeNoteName(new Date("2026-01-01T00:00:00.000Z"), "alice")).toBe("2026-01-01T00-00-00-000Z-alice");
});
