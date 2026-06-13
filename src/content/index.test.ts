import { expect, test } from "vitest";
import { GitHubContentStore } from "./github-content-store";
import { buildContentStore } from "./index";

test("buildContentStore returns a GitHubContentStore for a token+repo", () => {
  const store = buildContentStore("gho_token", "alice/sumi-content");
  expect(store).toBeInstanceOf(GitHubContentStore);
});
