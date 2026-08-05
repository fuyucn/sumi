import { expect, test } from "vitest";
import type { Comment } from "@/content/types";
import { commentDepth, MAX_COMMENT_DEPTH, replyAllowed } from "./comment-depth";

const root: Comment = { id: "a", handle: "x", date: "t", body: "" };
const child: Comment = { id: "b", handle: "x", date: "t", body: "", parentId: "a" };
const grand: Comment = { id: "c", handle: "x", date: "t", body: "", parentId: "b" };
const great: Comment = { id: "d", handle: "x", date: "t", body: "", parentId: "c" };
const greatGreat: Comment = { id: "e", handle: "x", date: "t", body: "", parentId: "d" };

test("commentDepth counts the ancestor chain", () => {
  const all = [root, child, grand, great];
  expect(commentDepth(all, "a")).toBe(1);
  expect(commentDepth(all, "b")).toBe(2);
  expect(commentDepth(all, "c")).toBe(3);
  expect(commentDepth(all, "d")).toBe(4);
});

test("commentDepth returns 0 for an unknown comment", () => {
  expect(commentDepth([root], "nope")).toBe(0);
});

test("commentDepth guards against a parent cycle", () => {
  const cyclic: Comment[] = [
    { ...root, parentId: "b" },
    { ...child, parentId: "a" },
  ];
  expect(commentDepth(cyclic, "a")).toBeLessThan(100);
});

test("MAX_COMMENT_DEPTH allows replies to depth MAX-1, blocks at MAX", () => {
  const all = [root, child, grand, great, greatGreat];
  // a depth-3 comment can still get a depth-4 reply
  expect(replyAllowed(all, grand)).toBe(true);
  // a depth-4 comment cannot get a depth-5 reply
  expect(replyAllowed(all, great)).toBe(false);
  expect(replyAllowed(all, greatGreat)).toBe(false);
  expect(MAX_COMMENT_DEPTH).toBe(4);
});