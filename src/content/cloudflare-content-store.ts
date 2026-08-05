import type { Comment, Magazine, NewComment, NewMagazine, NewPost, Post, PostMeta, PostStatus, Profile } from "./types";
import type { ContentStore, ListPostsOptions, SearchResult, TagInfo } from "./store";
import { slugify } from "./paths";
import { rankRows } from "./search-rank";
import { buildImageUrl, R2Store, type R2BucketLike } from "@/lib/r2";

/**
 * Minimal structural subset of the Cloudflare D1 API used by this store. A real
 * `D1Database` (from `@cloudflare/workers-types`) satisfies this shape, and a
 * test stub can too.
 */
export interface D1Like {
  prepare(query: string): D1PreparedStatementLike;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface PostRow {
  handle: string;
  slug: string;
  title: string;
  body: string;
  tags: string;
  excerpt: string | null;
  cover_image: string | null;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CommentRow {
  id: number;
  post_handle: string;
  post_slug: string;
  author_handle: string;
  body: string;
  date: string;
  parent_id: string | null;
}

interface MagazineRow {
  handle: string;
  slug: string;
  title: string;
  description: string | null;
  items: string;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  handle: string;
  display_name: string | null;
  bio: string | null;
  updated_at: string;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function parseItems(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function imageKey(handle: string, slug: string, filename: string): string {
  return `${handle}/${slug}/${filename}`;
}

/**
 * ContentStore backed by Cloudflare D1 (SQLite) for structured content and R2 for
 * images. Slugs are derived from titles, mirroring the GitHub implementation.
 */
export class CloudflareContentStore implements ContentStore {
  private readonly images: R2Store | null;

  constructor(private readonly db: D1Like, bucket?: R2BucketLike) {
    this.images = bucket ? new R2Store(bucket) : null;
  }

  // ---- Posts ----

  async listHandles(): Promise<string[]> {
    const rows = await this.rows<{ handle: string }>(
      `SELECT handle FROM posts
       UNION SELECT handle FROM magazines
       UNION SELECT handle FROM profiles
       ORDER BY handle`,
    );
    return rows.map((r) => r.handle);
  }

  async listPosts(opts: ListPostsOptions = {}): Promise<PostMeta[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (opts.handle !== undefined) {
      conditions.push("handle = ?");
      params.push(opts.handle);
    }
    if (opts.status !== undefined) {
      conditions.push("status = ?");
      params.push(opts.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.rows<PostRow>(
      `SELECT * FROM posts ${where} ORDER BY created_at DESC`,
      ...params,
    );
    return rows.map((r) => toPostMeta(r));
  }

  async getPost(handle: string, slug: string): Promise<Post | null> {
    const row = await this.row<PostRow>(
      `SELECT * FROM posts WHERE handle = ? AND slug = ?`,
      handle,
      slug,
    );
    return row ? toPost(row) : null;
  }

  async savePost(handle: string, post: NewPost): Promise<string> {
    const slug = slugify(post.title);
    const now = new Date().toISOString();
    const row: PostRow = {
      handle,
      slug,
      title: post.title,
      body: post.body,
      tags: JSON.stringify(post.tags ?? []),
      excerpt: post.excerpt ?? null,
      cover_image: post.coverImage ?? null,
      status: post.status ?? "draft",
      published_at: post.publishedAt ?? null,
      created_at: now,
      updated_at: now,
    };
    await this.run(
      `INSERT INTO posts (handle, slug, title, body, tags, excerpt, cover_image, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (handle, slug) DO UPDATE SET
         title = excluded.title,
         body = excluded.body,
         tags = excluded.tags,
         excerpt = excluded.excerpt,
         cover_image = excluded.cover_image,
         status = excluded.status,
         published_at = excluded.published_at,
         updated_at = excluded.updated_at`,
      row.handle, row.slug, row.title, row.body, row.tags, row.excerpt, row.cover_image,
      row.status, row.published_at, row.created_at, row.updated_at,
    );
    return slug;
  }

  async deletePost(handle: string, slug: string): Promise<void> {
    await this.run(`DELETE FROM comments WHERE post_handle = ? AND post_slug = ?`, handle, slug);
    await this.run(`DELETE FROM likes WHERE post_handle = ? AND post_slug = ?`, handle, slug);
    await this.run(`DELETE FROM posts WHERE handle = ? AND slug = ?`, handle, slug);
  }

  async uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string> {
    if (!this.images) {
      throw new Error("CloudflareContentStore: no R2 bucket configured for image uploads");
    }
    const key = imageKey(handle, slug, filename);
    await this.images.put(key, bytes);
    return buildImageUrl(key);
  }

  // ---- Comments ----

  async listComments(postHandle: string, slug: string): Promise<Comment[]> {
    const rows = await this.rows<CommentRow>(
      `SELECT * FROM comments WHERE post_handle = ? AND post_slug = ? ORDER BY date ASC`,
      postHandle,
      slug,
    );
    return rows.map((r) => ({
      id: String(r.id),
      handle: r.author_handle,
      date: r.date,
      body: r.body,
      ...(r.parent_id !== null ? { parentId: r.parent_id } : {}),
    }));
  }

  async addComment(postHandle: string, slug: string, comment: NewComment, authorHandle: string, now: Date): Promise<Comment> {
    const date = now.toISOString();
    await this.run(
      `INSERT INTO comments (post_handle, post_slug, author_handle, body, date, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      postHandle, slug, authorHandle, comment.body, date, comment.parentId ?? null, date,
    );
    const row = await this.row<CommentRow>(
      `SELECT * FROM comments WHERE post_handle = ? AND post_slug = ? AND author_handle = ? AND date = ? LIMIT 1`,
      postHandle, slug, authorHandle, date,
    );
    const full: Comment = {
      id: row ? String(row.id) : `${Date.now()}-${authorHandle}`,
      handle: authorHandle,
      date,
      body: comment.body,
      ...(comment.parentId !== undefined ? { parentId: comment.parentId } : {}),
    };
    return full;
  }

  // ---- Likes ----

  async listLikes(postHandle: string, slug: string): Promise<string[]> {
    const rows = await this.rows<{ liker_handle: string }>(
      `SELECT liker_handle FROM likes WHERE post_handle = ? AND post_slug = ?`,
      postHandle,
      slug,
    );
    return rows.map((r) => r.liker_handle);
  }

  async addLike(postHandle: string, slug: string, likerHandle: string, now: Date): Promise<void> {
    await this.run(
      `INSERT OR IGNORE INTO likes (post_handle, post_slug, liker_handle, created_at)
       VALUES (?, ?, ?, ?)`,
      postHandle, slug, likerHandle, now.toISOString(),
    );
  }

  async removeLike(postHandle: string, slug: string, likerHandle: string): Promise<void> {
    await this.run(
      `DELETE FROM likes WHERE post_handle = ? AND post_slug = ? AND liker_handle = ?`,
      postHandle, slug, likerHandle,
    );
  }

  // ---- Follows ----

  async listFollowers(handle: string): Promise<string[]> {
    const rows = await this.rows<{ follower_handle: string }>(
      `SELECT follower_handle FROM follows WHERE followee_handle = ?`,
      handle,
    );
    return rows.map((r) => r.follower_handle);
  }

  async listFollowing(handle: string): Promise<string[]> {
    const rows = await this.rows<{ followee_handle: string }>(
      `SELECT followee_handle FROM follows WHERE follower_handle = ?`,
      handle,
    );
    return rows.map((r) => r.followee_handle);
  }

  async addFollow(followerHandle: string, followeeHandle: string, now: Date): Promise<void> {
    await this.run(
      `INSERT OR IGNORE INTO follows (follower_handle, followee_handle, created_at)
       VALUES (?, ?, ?)`,
      followerHandle, followeeHandle, now.toISOString(),
    );
  }

  async removeFollow(followerHandle: string, followeeHandle: string): Promise<void> {
    await this.run(
      `DELETE FROM follows WHERE follower_handle = ? AND followee_handle = ?`,
      followerHandle, followeeHandle,
    );
  }

  // ---- Profile ----

  async getProfile(handle: string): Promise<Profile | null> {
    const row = await this.row<ProfileRow>(
      `SELECT * FROM profiles WHERE handle = ?`,
      handle,
    );
    if (!row) return null;
    return toProfile(row);
  }

  async saveProfile(handle: string, profile: Profile): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO profiles (handle, display_name, bio, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (handle) DO UPDATE SET
         display_name = excluded.display_name,
         bio = excluded.bio,
         updated_at = excluded.updated_at`,
      handle, profile.displayName ?? null, profile.bio ?? null, now,
    );
  }

  // ---- Magazines ----

  async listMagazines(handle: string): Promise<Magazine[]> {
    const rows = await this.rows<MagazineRow>(
      `SELECT * FROM magazines WHERE handle = ? ORDER BY created_at ASC`,
      handle,
    );
    return rows.map((r) => toMagazine(r));
  }

  async getMagazine(handle: string, slug: string): Promise<Magazine | null> {
    const row = await this.row<MagazineRow>(
      `SELECT * FROM magazines WHERE handle = ? AND slug = ?`,
      handle,
      slug,
    );
    return row ? toMagazine(row) : null;
  }

  async saveMagazine(handle: string, magazine: NewMagazine): Promise<string> {
    const slug = slugify(magazine.title);
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO magazines (handle, slug, title, description, items, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (handle, slug) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         items = excluded.items,
         updated_at = excluded.updated_at`,
      handle, slug, magazine.title, magazine.description ?? null, JSON.stringify(magazine.items ?? []), now, now,
    );
    return slug;
  }

  async deleteMagazine(handle: string, slug: string): Promise<void> {
    await this.run(`DELETE FROM magazines WHERE handle = ? AND slug = ?`, handle, slug);
  }

  // ---- Tags ----

  async listTags(): Promise<TagInfo[]> {
    const rows = await this.rows<{ tags: string }>(
      `SELECT tags FROM posts WHERE status = 'published'`,
    );
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const raw of parseTags(row.tags)) {
        const name = raw.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async searchPosts(query: string): Promise<SearchResult[]> {
    const needle = query.trim();
    if (!needle) return [];
    const like = `%${needle}%`;
    const rows = await this.rows<PostRow>(
      `SELECT * FROM posts
       WHERE status = 'published'
         AND (title LIKE ? OR body LIKE ? OR excerpt LIKE ? OR tags LIKE ?)`,
      like, like, like, like,
    );
    return rankRows(
      rows.map((r) => ({
        row: r,
        rank: {
          title: r.title,
          body: r.body,
          excerpt: r.excerpt,
          tags: parseTags(r.tags),
          publishedAt: r.published_at,
          createdAt: r.created_at,
        },
      })),
      needle,
    ).map(({ row }) => ({ handle: row.handle, post: toPostMeta(row) }));
  }

  // ---- D1 helpers ----

  private async rows<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const res = await this.db.prepare(sql).bind(...params).all<T>();
    return res.results as T[];
  }

  private async row<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    return await this.db.prepare(sql).bind(...params).first<T>();
  }

  private async run(sql: string, ...params: unknown[]): Promise<void> {
    await this.db.prepare(sql).bind(...params).run();
  }
}

function toPostMeta(r: PostRow): PostMeta {
  return {
    title: r.title,
    slug: r.slug,
    tags: parseTags(r.tags),
    status: r.status,
    ...(r.excerpt !== null ? { excerpt: r.excerpt } : {}),
    ...(r.cover_image !== null ? { coverImage: r.cover_image } : {}),
    ...(r.published_at !== null ? { publishedAt: r.published_at } : {}),
  };
}

function toPost(r: PostRow): Post {
  return { ...toPostMeta(r), body: r.body };
}

function toProfile(r: ProfileRow): Profile {
  return {
    ...(r.display_name !== null ? { displayName: r.display_name } : {}),
    ...(r.bio !== null ? { bio: r.bio } : {}),
  };
}

function toMagazine(r: MagazineRow): Magazine {
  return {
    slug: r.slug,
    title: r.title,
    items: parseItems(r.items),
    ...(r.description !== null ? { description: r.description } : {}),
  };
}
