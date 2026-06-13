import { githubClientFromToken, readGitHubClient } from "@/lib/github";
import { env } from "@/lib/env";
import { getGithubToken } from "./github-token";
import { GitHubContentStore } from "./github-content-store";
import type { ContentStore } from "./store";

export type { ContentStore } from "./store";
export { GitHubContentStore } from "./github-content-store";

/** Build a content store from an explicit token + repo (no I/O). */
export function buildContentStore(token: string, repo: string): ContentStore {
  return new GitHubContentStore(githubClientFromToken(token, repo));
}

/** Build the content store for a signed-in user. Null if no token or repo configured. */
export async function getContentStoreForUser(userId: string): Promise<ContentStore | null> {
  const token = await getGithubToken(userId);
  const repo = env.GITHUB_CONTENT_REPO;
  if (!token || !repo) return null;
  return buildContentStore(token, repo);
}

/** A content store for PUBLIC reads (no signed-in user needed). Null if no repo configured. */
export function getReadContentStore(): ContentStore | null {
  const repo = env.GITHUB_CONTENT_REPO;
  if (!repo) return null;
  return new GitHubContentStore(readGitHubClient(repo, env.GITHUB_CONTENT_TOKEN));
}
