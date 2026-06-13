import { expect, test } from "vitest";
import { getUserHandle } from "./user";

function fakeDb(rows: Array<{ username: string | null }>) {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }),
  } as never;
}

test("returns the username (handle) for a user", async () => {
  expect(await getUserHandle("u1", fakeDb([{ username: "alice" }]))).toBe("alice");
});
test("returns null when user has no username", async () => {
  expect(await getUserHandle("u1", fakeDb([{ username: null }]))).toBeNull();
});
test("returns null when no row", async () => {
  expect(await getUserHandle("u1", fakeDb([]))).toBeNull();
});
