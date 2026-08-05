/**
 * One-shot importer: GitHub content repo → Postgres mirror (sumi_* tables).
 *
 * Reads every creator's posts, comments (preserving ids + parentId), magazines
 * and profiles from a GitHubContentStore and writes them into the Postgres
 * mirror via the DbContentStore. Images stay in GitHub/R2 (the mirror has no
 * object store), so this cannot be re-run without clearing `sumi_posts` etc.
 *
 * Run inside a container on the compose network (e.g. the `sumi-migrate` image,
 * which has full source + vitest for `@/` alias resolution):
 *   docker run --rm --network sumi_default \
 *     -e DATABASE_URL='postgresql://sumi:sumi@db:5432/sumi' \
 *     -e GITHUB_CONTENT_REPO='<owner>/<repo>' \
 *     -v "$PWD/scripts:/app/scripts:ro" \
 *     sumi-migrate pnpm exec vitest run \
 *       --config scripts/vitest.import.config.ts \
 *       scripts/import-content.test.ts
 */
import { createDb } from "../src/lib/db";
import type { ContentStore } from "../src/content/store";
import { DbContentStore } from "../src/content/db-content-store";
import { sumiComments } from "../src/db/schema";

export interface ImportResult {
  handles: number;
  posts: number;
  profiles: number;
  magazines: number;
  comments: number;
}

export async function importContent(
  github: ContentStore,
  databaseUrl: string,
): Promise<ImportResult> {
  const state = new DbContentStore(createDb(databaseUrl) as never);
  const ddirect = createDb(databaseUrl);
  const counts: ImportResult = { handles: 0, posts: 0, profiles: 0, magazines: 0, comments: 0 };

  for (const handle of await github.listHandles()) {
    counts.handles += 1;

    const profile = await github.getProfile(handle);
    if (profile) {
      await state.saveProfile(handle, profile);
      counts.profiles += 1;
    }

    for (const meta of await github.listPosts({ handle })) {
      const post = await github.getPost(handle, meta.slug);
      if (!post) continue;
      await state.savePost(handle, {
        title: post.title,
        body: post.body,
        tags: post.tags,
        ...(post.excerpt !== undefined ? { excerpt: post.excerpt } : {}),
        ...(post.coverImage !== undefined ? { coverImage: post.coverImage } : {}),
        status: post.status,
        ...(post.publishedAt !== undefined ? { publishedAt: post.publishedAt } : {}),
      });
      counts.posts += 1;

      // Comments must keep their original id + parentId for nesting, so insert
      // them directly (DbContentStore.addComment would mint new ids).
      const comments = await github.listComments(handle, post.slug);
      for (const c of comments) {
        await ddirect.insert(sumiComments).values({
          id: c.id,
          postHandle: handle,
          postSlug: post.slug,
          authorHandle: c.handle,
          body: c.body,
          date: c.date,
          parentId: c.parentId ?? null,
          createdAt: c.date,
        });
        counts.comments += 1;
      }
    }

    for (const m of await github.listMagazines(handle)) {
      await state.saveMagazine(handle, {
        title: m.title,
        ...(m.description !== undefined ? { description: m.description } : {}),
        items: m.items,
      });
      counts.magazines += 1;
    }
  }

  return counts;
}