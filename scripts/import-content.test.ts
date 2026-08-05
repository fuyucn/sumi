/**
 * Vitest runner for scripts/import-content.ts. Lives here (not under src/) so it
 * is excluded from the regular `pnpm test` suite. Run explicitly in a container:
 *   docker run --rm --network sumi_default \
 *     -e DATABASE_URL='postgresql://sumi:sumi@db:5432/sumi' \
 *     -e GITHUB_CONTENT_REPO='owner/repo' \
 *     -v "$PWD/scripts:/app/scripts:ro" \
 *     sumi-migrate pnpm exec vitest run \
 *       --config scripts/vitest.import.config.ts \
 *       scripts/import-content.test.ts
 */
import { expect, test } from "vitest";
import { GitHubContentStore } from "../src/content/github-content-store";
import { readGitHubClient } from "../src/lib/github";
import { importContent } from "./import-content";

test("imports GitHub content into the Postgres mirror", async () => {
  const repo = process.env.GITHUB_CONTENT_REPO ?? "";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  expect(repo, "GITHUB_CONTENT_REPO required").toBeTruthy();
  expect(databaseUrl, "DATABASE_URL required").toBeTruthy();

  const github = new GitHubContentStore(readGitHubClient(repo));
  const counts = await importContent(github, databaseUrl);

  console.log("Import complete:", counts);
  expect(counts.handles).toBeGreaterThan(0);
}, 120_000);