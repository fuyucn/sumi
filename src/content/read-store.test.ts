import { expect, test } from "vitest";
import { GitHubContentStore } from "./github-content-store";
import { getReadContentStore } from "./index";

test("getReadContentStore builds a store when a content repo is configured", async () => {
  expect(await getReadContentStore()).toBeInstanceOf(GitHubContentStore);
});
