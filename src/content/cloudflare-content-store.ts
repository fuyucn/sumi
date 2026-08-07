import type { Comment, Friend, Magazine, NewComment, NewFriend, NewMagazine, NewNote, NewNotification, NewPage, NewPost, NewProject, Note, Notification, Page, PageMeta, Post, PostMeta, PostStatus, Profile, Project } from "./types";
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

interface NoteRow {
  id: string;
  handle: string;
  body: string;
  date: string;
}

interface FriendRow {
  id: string;
  name: string;
  url: string;
  avatar: string | null;
  bio: string | null;
  created_at: string;
}

interface ProjectRow {
  handle: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  repo: string | null;
  tech: string;
  cover_image: string | null;
  gallery: string | null;
  featured: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PageRow {
  handle: string;
  slug: string;
  title: string;
  description: string | null;
  body: string;
  show_in_nav: number;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  handle: string;
  type: string;
  actor: string;
  post_handle: string | null;
  post_slug: string | null;
  comment_id: string | null;
  body: string | null;
  date: string;
  read: number;
  created_at: string;
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
       UNION SELECT handle FROM notes
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

  async deleteComment(postHandle: string, slug: string, commentId: string): Promise<void> {
    await this.run(
      `DELETE FROM comments WHERE post_handle = ? AND post_slug = ? AND id = ?`,
      postHandle, slug, Number(commentId),
    );
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

  // ---- Notes (手记) ----

  async listNotes(handle: string): Promise<Note[]> {
    const rows = await this.rows<NoteRow>(
      `SELECT * FROM notes WHERE handle = ? ORDER BY date DESC`,
      handle,
    );
    return rows.map((r) => ({ id: r.id, handle: r.handle, body: r.body, date: r.date }));
  }

  async addNote(handle: string, note: NewNote, now: Date): Promise<Note> {
    const date = now.toISOString();
    const id = date.replace(/[:.]/g, "-") + "-" + (slugify(handle) || "user");
    await this.run(
      `INSERT OR IGNORE INTO notes (id, handle, body, date, created_at) VALUES (?, ?, ?, ?, ?)`,
      id, handle, note.body, date, date,
    );
    return { id, handle, body: note.body, date };
  }

  async deleteNote(handle: string, id: string): Promise<void> {
    await this.run(`DELETE FROM notes WHERE handle = ? AND id = ?`, handle, id);
  }

  // ---- Friends (友链) ----

  async listFriends(): Promise<Friend[]> {
    const rows = await this.rows<FriendRow>(
      `SELECT * FROM friends ORDER BY created_at ASC`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      createdAt: r.created_at,
      ...(r.avatar !== null ? { avatar: r.avatar } : {}),
      ...(r.bio !== null ? { bio: r.bio } : {}),
    }));
  }

  async addFriend(friend: NewFriend, now: Date): Promise<Friend> {
    const createdAt = now.toISOString();
    const id = createdAt.replace(/[:.]/g, "-") + "-" + (slugify(friend.name) || "friend");
    await this.run(
      `INSERT OR IGNORE INTO friends (id, name, url, avatar, bio, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      id, friend.name, friend.url, friend.avatar ?? null, friend.bio ?? null, createdAt,
    );
    return {
      id,
      name: friend.name,
      url: friend.url,
      createdAt,
      ...(friend.avatar !== undefined ? { avatar: friend.avatar } : {}),
      ...(friend.bio !== undefined ? { bio: friend.bio } : {}),
    };
  }

  async deleteFriend(id: string): Promise<void> {
    await this.run(`DELETE FROM friends WHERE id = ?`, id);
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

  // ---- Projects (showcase) ----

  async listProjects(handle: string): Promise<Project[]> {
    const rows = await this.rows<ProjectRow>(
      `SELECT * FROM projects WHERE handle = ? ORDER BY featured DESC, sort_order ASC, title ASC`,
      handle,
    );
    return rows.map((r) => toProject(r));
  }

  async getProject(handle: string, slug: string): Promise<Project | null> {
    const row = await this.row<ProjectRow>(
      `SELECT * FROM projects WHERE handle = ? AND slug = ?`,
      handle,
      slug,
    );
    return row ? toProject(row) : null;
  }

  async saveProject(handle: string, project: NewProject): Promise<string> {
    const slug = slugify(project.title);
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO projects (handle, slug, title, description, url, repo, tech, cover_image, gallery, featured, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (handle, slug) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         url = excluded.url,
         repo = excluded.repo,
         tech = excluded.tech,
         cover_image = excluded.cover_image,
         gallery = excluded.gallery,
         featured = excluded.featured,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
      handle, slug, project.title, project.description ?? null, project.url ?? null, project.repo ?? null,
      JSON.stringify(project.tech ?? []), project.coverImage ?? null, JSON.stringify(project.gallery ?? []),
      project.featured ? 1 : 0, project.order ?? 0, now, now,
    );
    return slug;
  }

  async deleteProject(handle: string, slug: string): Promise<void> {
    await this.run(`DELETE FROM projects WHERE handle = ? AND slug = ?`, handle, slug);
  }

  // ---- Independent pages (自定义独立页) ----

  async listPages(handle: string): Promise<PageMeta[]> {
    const rows = await this.rows<PageRow>(
      `SELECT * FROM pages WHERE handle = ? ORDER BY created_at DESC`,
      handle,
    );
    return rows.map((r) => toPageMeta(r));
  }

  async getPage(handle: string, slug: string): Promise<Page | null> {
    const row = await this.row<PageRow>(
      `SELECT * FROM pages WHERE handle = ? AND slug = ?`,
      handle,
      slug,
    );
    return row ? toPage(row) : null;
  }

  async savePage(handle: string, page: NewPage): Promise<string> {
    const slug = slugify(page.title);
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO pages (handle, slug, title, description, body, show_in_nav, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (handle, slug) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         body = excluded.body,
         show_in_nav = excluded.show_in_nav,
         updated_at = excluded.updated_at`,
      handle, slug, page.title, page.description ?? null, page.body, page.showInNav ? 1 : 0, now, now,
    );
    return slug;
  }

  async deletePage(handle: string, slug: string): Promise<void> {
    await this.run(`DELETE FROM pages WHERE handle = ? AND slug = ?`, handle, slug);
  }

  // ---- Notifications ----

  async listNotifications(handle: string): Promise<Notification[]> {
    const rows = await this.rows<NotificationRow>(
      `SELECT * FROM notifications WHERE handle = ? ORDER BY date DESC LIMIT 100`,
      handle,
    );
    return rows.map((r) => toNotification(r));
  }

  async addNotification(handle: string, notification: NewNotification, now: Date): Promise<Notification> {
    const id = `ntf-${now.toISOString().replace(/[:.]/g, "-")}`;
    const full: Notification = { id, handle, date: now.toISOString(), read: false, ...notification };
    await this.run(
      `INSERT INTO notifications (id, handle, type, actor, post_handle, post_slug, comment_id, body, date, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      id,
      handle,
      full.type,
      full.actor,
      full.postHandle ?? null,
      full.postSlug ?? null,
      full.commentId ?? null,
      full.body ?? null,
      full.date,
      now.toISOString(),
    );
    return full;
  }

  async markNotificationsRead(handle: string): Promise<number> {
    const rows = await this.rows<{ id: string }>(
      `SELECT id FROM notifications WHERE handle = ? AND read = 0`,
      handle,
    );
    if (rows.length === 0) return 0;
    await this.run(`UPDATE notifications SET read = 1 WHERE handle = ? AND read = 0`, handle);
    return rows.length;
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

function toProject(r: ProjectRow): Project {
  return {
    slug: r.slug,
    handle: r.handle,
    title: r.title,
    tech: parseItems(r.tech),
    featured: r.featured === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(r.description !== null ? { description: r.description } : {}),
    ...(r.url !== null ? { url: r.url } : {}),
    ...(r.repo !== null ? { repo: r.repo } : {}),
    ...(r.cover_image !== null ? { coverImage: r.cover_image } : {}),
    ...(r.gallery !== null && r.gallery.length > 0 ? { gallery: parseItems(r.gallery) } : {}),
    ...(r.sort_order !== 0 ? { order: r.sort_order } : {}),
  };
}

function toPageMeta(r: PageRow): PageMeta {
  return {
    slug: r.slug,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(r.description !== null ? { description: r.description } : {}),
    ...(r.show_in_nav === 1 ? { showInNav: true } : {}),
  };
}

function toPage(r: PageRow): Page {
  return { ...toPageMeta(r), handle: r.handle, body: r.body };
}

function toNotification(r: NotificationRow): Notification {
  const type = r.type;
  if (type !== "comment" && type !== "reply" && type !== "like" && type !== "follow") {
    // Defensive: DB rows with an unknown type should not crash the list page.
    return {
      id: r.id,
      handle: r.handle,
      actor: r.actor,
      date: r.date,
      read: r.read === 1,
      type: "comment",
    };
  }
  return {
    id: r.id,
    handle: r.handle,
    type,
    actor: r.actor,
    date: r.date,
    read: r.read === 1,
    ...(r.post_handle !== null ? { postHandle: r.post_handle } : {}),
    ...(r.post_slug !== null ? { postSlug: r.post_slug } : {}),
    ...(r.comment_id !== null ? { commentId: r.comment_id } : {}),
    ...(r.body !== null ? { body: r.body } : {}),
  };
}
