import { expect, test } from "vitest";
import { getGithubToken } from "./github-token";

function fakeDb(rows: Array<{ accessToken: string | null }>) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  } as never;
}

test("returns the github access token for a user", async () => {
  const token = await getGithubToken("user-1", fakeDb([{ accessToken: "gho_xxx" }]));
  expect(token).toBe("gho_xxx");
});

test("returns null when no github account row exists", async () => {
  const token = await getGithubToken("user-1", fakeDb([]));
  expect(token).toBeNull();
});

test("returns null when the token column is null", async () => {
  const token = await getGithubToken("user-1", fakeDb([{ accessToken: null }]));
  expect(token).toBeNull();
});
