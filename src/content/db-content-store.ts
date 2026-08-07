import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { schema as dbSchema } from "@/db/schema";
import {
  sumiComments,
  sumiFollows,
  sumiFriends,
  sumiImages,
  sumiLikes,
  sumiMagazines,
  sumiNotes,
  sumiNotifications,
  sumiPages,
  sumiPosts,
  sumiProfiles,
  sumiProjects,
} from "@/db/schema";
import type { ContentStore, ListPostsOptions, SearchResult, TagInfo } from "./store";
import type { Comment, Friend, Magazine, NewComment, NewFriend, NewMagazine, NewNote, NewNotification, NewPage, NewPost, NewProject, Note, Notification, Page, PageMeta, Post, PostMeta, PostStatus, Profile, Project } from "./types";
import { slugify } from "./paths";
import { rankRows } from "./search-rank";

type Db = PostgresJsDatabase<typeof dbSchema>;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

function mimeForFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

interface PostRow {
  handle: string;
  slug: string;
  title: string;
  body: string;
  tags: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  publishedAt: string | null;
  agent: boolean;
}

interface MagazineRow {
  handle: string;
  slug: string;
  title: string;
  description: string | null;
  items: string;
}

interface ProjectRow {
  handle: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  repo: string | null;
  tech: string;
  coverImage: string | null;
  gallery: string | null;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PageRow {
  handle: string;
  slug: string;
  title: string;
  description: string | null;
  body: string;
  showInNav: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationRow {
  id: string;
  handle: string;
  type: string;
  actor: string;
  postHandle: string | null;
  postSlug: string | null;
  commentId: string | null;
  body: string | null;
  date: string;
  read: boolean;
  createdAt: string;
}

function parseJsonList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/**
 * ContentStore backed by Postgres (drizzle), mirroring the shapes used by the
 * GitHub/Cloudflare stores. Enable with `DB_MIRROR=1`; the mirror tables are
 * created by `pnpm db:migrate` (see `drizzle/0001_sumi_mirror.sql`).
 */
export class DbContentStore implements ContentStore {
  constructor(private readonly db: Db) {}

  // ---- Posts ----

  async listHandles(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ handle: sumiPosts.handle })
      .from(sumiPosts)
      .unionAll(this.db.selectDistinct({ handle: sumiMagazines.handle }).from(sumiMagazines))
      .unionAll(this.db.selectDistinct({ handle: sumiProfiles.handle }).from(sumiProfiles))
      .unionAll(this.db.selectDistinct({ handle: sumiNotes.handle }).from(sumiNotes));
    const handles = new Set(rows.map((r) => r.handle));
    return [...handles].sort();
  }

  async listPosts(opts: ListPostsOptions = {}): Promise<PostMeta[]> {
    const conditions: ReturnType<typeof sql>[] = [];
    if (opts.handle !== undefined) conditions.push(sql`${sumiPosts.handle} = ${opts.handle}`);
    if (opts.status !== undefined) conditions.push(sql`${sumiPosts.status} = ${opts.status}`);
    const rows = await this.db
      .select()
      .from(sumiPosts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${sumiPosts.createdAt} DESC`);
    return rows.map((r) => toPostMeta(r));
  }

  async getPost(handle: string, slug: string): Promise<Post | null> {
    const row = await this.db
      .select()
      .from(sumiPosts)
      .where(sql`${sumiPosts.handle} = ${handle} AND ${sumiPosts.slug} = ${slug}`)
      .limit(1);
    return row.length ? toPost(row[0]) : null;
  }

  async savePost(handle: string, post: NewPost): Promise<string> {
    const slug = slugify(post.title);
    const now = new Date().toISOString();
    const full: PostRow = {
      handle,
      slug,
      title: post.title,
      body: post.body,
      tags: JSON.stringify(post.tags ?? []),
      excerpt: post.excerpt ?? null,
      coverImage: post.coverImage ?? null,
      status: post.status ?? "draft",
      publishedAt: post.publishedAt ?? null,
      agent: post.agent ?? false,
    };
    await this.db
      .insert(sumiPosts)
      .values({ ...full, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [sumiPosts.handle, sumiPosts.slug],
        set: {
          title: post.title,
          body: post.body,
          tags: full.tags,
          excerpt: full.excerpt,
          coverImage: full.coverImage,
          status: full.status,
          publishedAt: full.publishedAt,
          agent: full.agent,
          updatedAt: now,
        },
      });
    return slug;
  }

  async deletePost(handle: string, slug: string): Promise<void> {
    await this.db
      .delete(sumiComments)
      .where(sql`${sumiComments.postHandle} = ${handle} AND ${sumiComments.postSlug} = ${slug}`);
    await this.db
      .delete(sumiLikes)
      .where(sql`${sumiLikes.postHandle} = ${handle} AND ${sumiLikes.postSlug} = ${slug}`);
    await this.db.delete(sumiPosts).where(sql`${sumiPosts.handle} = ${handle} AND ${sumiPosts.slug} = ${slug}`);
  }

  async uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string> {
    // The Postgres mirror has no GitHub/R2 object store, so images live in a
    // `sumi_images` BYTEA table and are served by `/api/images/:id`.
    const mime = mimeForFilename(filename);
    const id = randomUUID();
    await this.db.insert(sumiImages).values({
      id,
      handle,
      slug,
      filename,
      mime,
      bytes,
      createdAt: new Date().toISOString(),
    });
    return `/api/images/${id}`;
  }

  // ---- Comments ----

  async listComments(postHandle: string, slug: string): Promise<Comment[]> {
    const rows = await this.db
      .select()
      .from(sumiComments)
      .where(sql`${sumiComments.postHandle} = ${postHandle} AND ${sumiComments.postSlug} = ${slug}`)
      .orderBy(sql`${sumiComments.date} ASC`);
    return rows.map((r) => ({
      id: r.id,
      handle: r.authorHandle,
      date: r.date,
      body: r.body,
      ...(r.parentId ? { parentId: r.parentId } : {}),
    }));
  }

  async addComment(postHandle: string, slug: string, comment: NewComment, authorHandle: string, now: Date): Promise<Comment> {
    const full: Comment = {
      id: now.toISOString().replace(/[:.]/g, "-") + "-" + (slugify(authorHandle) || "user"),
      handle: authorHandle,
      date: now.toISOString(),
      body: comment.body,
      ...(comment.parentId !== undefined ? { parentId: comment.parentId } : {}),
    };
    await this.db.insert(sumiComments).values({
      id: full.id,
      postHandle,
      postSlug: slug,
      authorHandle,
      body: comment.body,
      date: full.date,
      parentId: full.parentId ?? null,
      createdAt: full.date,
    });
    return full;
  }

  async deleteComment(postHandle: string, slug: string, commentId: string): Promise<void> {
    await this.db
      .delete(sumiComments)
      .where(
        and(
          eq(sumiComments.postHandle, postHandle),
          eq(sumiComments.postSlug, slug),
          eq(sumiComments.id, commentId),
        ),
      );
  }

  // ---- Likes ----

  async listLikes(postHandle: string, slug: string): Promise<string[]> {
    const rows = await this.db
      .select({ likerHandle: sumiLikes.likerHandle })
      .from(sumiLikes)
      .where(and(eq(sumiLikes.postHandle, postHandle), eq(sumiLikes.postSlug, slug)));
    return rows.map((r) => r.likerHandle);
  }

  async addLike(postHandle: string, slug: string, likerHandle: string, now: Date): Promise<void> {
    await this.db
      .insert(sumiLikes)
      .values({
        postHandle,
        postSlug: slug,
        likerHandle,
        createdAt: now.toISOString(),
      })
      .onConflictDoNothing();
  }

  async removeLike(postHandle: string, slug: string, likerHandle: string): Promise<void> {
    await this.db
      .delete(sumiLikes)
      .where(
        and(
          eq(sumiLikes.postHandle, postHandle),
          eq(sumiLikes.postSlug, slug),
          eq(sumiLikes.likerHandle, likerHandle),
        ),
      );
  }

  // ---- Follows ----

  async listFollowers(handle: string): Promise<string[]> {
    const rows = await this.db
      .select({ followerHandle: sumiFollows.followerHandle })
      .from(sumiFollows)
      .where(eq(sumiFollows.followeeHandle, handle));
    return rows.map((r) => r.followerHandle);
  }

  async listFollowing(handle: string): Promise<string[]> {
    const rows = await this.db
      .select({ followeeHandle: sumiFollows.followeeHandle })
      .from(sumiFollows)
      .where(eq(sumiFollows.followerHandle, handle));
    return rows.map((r) => r.followeeHandle);
  }

  async addFollow(followerHandle: string, followeeHandle: string, now: Date): Promise<void> {
    await this.db
      .insert(sumiFollows)
      .values({
        followerHandle,
        followeeHandle,
        createdAt: now.toISOString(),
      })
      .onConflictDoNothing();
  }

  async removeFollow(followerHandle: string, followeeHandle: string): Promise<void> {
    await this.db
      .delete(sumiFollows)
      .where(
        and(
          eq(sumiFollows.followerHandle, followerHandle),
          eq(sumiFollows.followeeHandle, followeeHandle),
        ),
      );
  }

  // ---- Profile ----

  async getProfile(handle: string): Promise<Profile | null> {
    const rows = await this.db
      .select()
      .from(sumiProfiles)
      .where(sql`${sumiProfiles.handle} = ${handle}`)
      .limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...(r.displayName ? { displayName: r.displayName } : {}),
      ...(r.bio ? { bio: r.bio } : {}),
    };
  }

  async saveProfile(handle: string, profile: Profile): Promise<void> {
    await this.db
      .insert(sumiProfiles)
      .values({
        handle,
        displayName: profile.displayName ?? null,
        bio: profile.bio ?? null,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: sumiProfiles.handle,
        set: {
          displayName: profile.displayName ?? null,
          bio: profile.bio ?? null,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  // ---- Notes (手记) ----

  async listNotes(handle: string): Promise<Note[]> {
    const rows = await this.db
      .select()
      .from(sumiNotes)
      .where(sql`${sumiNotes.handle} = ${handle}`)
      .orderBy(sql`${sumiNotes.date} DESC`);
    return rows.map((r) => ({ id: r.id, handle: r.handle, body: r.body, date: r.date }));
  }

  async addNote(handle: string, note: NewNote, now: Date): Promise<Note> {
    const date = now.toISOString();
    const full: Note = {
      id: date.replace(/[:.]/g, "-") + "-" + (slugify(handle) || "user"),
      handle,
      body: note.body,
      date,
    };
    await this.db.insert(sumiNotes).values({
      id: full.id,
      handle,
      body: note.body,
      date,
      createdAt: date,
    });
    return full;
  }

  async deleteNote(handle: string, id: string): Promise<void> {
    await this.db
      .delete(sumiNotes)
      .where(sql`${sumiNotes.handle} = ${handle} AND ${sumiNotes.id} = ${id}`);
  }

  // ---- Friends (友链) ----

  async listFriends(): Promise<Friend[]> {
    const rows = await this.db
      .select()
      .from(sumiFriends)
      .orderBy(sql`${sumiFriends.createdAt} ASC`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      createdAt: r.createdAt,
      ...(r.avatar ? { avatar: r.avatar } : {}),
      ...(r.bio ? { bio: r.bio } : {}),
    }));
  }

  async addFriend(friend: NewFriend, now: Date): Promise<Friend> {
    const createdAt = now.toISOString();
    const full: Friend = {
      id: createdAt.replace(/[:.]/g, "-") + "-" + (slugify(friend.name) || "friend"),
      name: friend.name,
      url: friend.url,
      createdAt,
      ...(friend.avatar !== undefined ? { avatar: friend.avatar } : {}),
      ...(friend.bio !== undefined ? { bio: friend.bio } : {}),
    };
    await this.db.insert(sumiFriends).values({
      id: full.id,
      name: friend.name,
      url: friend.url,
      avatar: friend.avatar ?? null,
      bio: friend.bio ?? null,
      createdAt,
    });
    return full;
  }

  async deleteFriend(id: string): Promise<void> {
    await this.db.delete(sumiFriends).where(sql`${sumiFriends.id} = ${id}`);
  }

  // ---- Magazines ----

  async listMagazines(handle: string): Promise<Magazine[]> {
    const rows = await this.db
      .select()
      .from(sumiMagazines)
      .where(sql`${sumiMagazines.handle} = ${handle}`)
      .orderBy(sql`${sumiMagazines.createdAt} ASC`);
    return rows.map((r) => toMagazine(r));
  }

  async getMagazine(handle: string, slug: string): Promise<Magazine | null> {
    const rows = await this.db
      .select()
      .from(sumiMagazines)
      .where(sql`${sumiMagazines.handle} = ${handle} AND ${sumiMagazines.slug} = ${slug}`)
      .limit(1);
    return rows.length ? toMagazine(rows[0]) : null;
  }

  async saveMagazine(handle: string, magazine: NewMagazine): Promise<string> {
    const slug = slugify(magazine.title);
    const now = new Date().toISOString();
    await this.db
      .insert(sumiMagazines)
      .values({
        handle,
        slug,
        title: magazine.title,
        description: magazine.description ?? null,
        items: JSON.stringify(magazine.items ?? []),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sumiMagazines.handle, sumiMagazines.slug],
        set: {
          title: magazine.title,
          description: magazine.description ?? null,
          items: JSON.stringify(magazine.items ?? []),
          updatedAt: now,
        },
      });
    return slug;
  }

  async deleteMagazine(handle: string, slug: string): Promise<void> {
    await this.db
      .delete(sumiMagazines)
      .where(sql`${sumiMagazines.handle} = ${handle} AND ${sumiMagazines.slug} = ${slug}`);
  }

  // ---- Projects (showcase) ----

  async listProjects(handle: string): Promise<Project[]> {
    const rows = await this.db
      .select()
      .from(sumiProjects)
      .where(sql`${sumiProjects.handle} = ${handle}`)
      .orderBy(sql`${sumiProjects.featured} DESC, ${sumiProjects.sortOrder} ASC, ${sumiProjects.title} ASC`);
    return rows.map((r) => toProject(r));
  }

  async getProject(handle: string, slug: string): Promise<Project | null> {
    const rows = await this.db
      .select()
      .from(sumiProjects)
      .where(sql`${sumiProjects.handle} = ${handle} AND ${sumiProjects.slug} = ${slug}`)
      .limit(1);
    return rows.length ? toProject(rows[0]) : null;
  }

  async saveProject(handle: string, project: NewProject): Promise<string> {
    const slug = slugify(project.title);
    const now = new Date().toISOString();
    await this.db
      .insert(sumiProjects)
      .values({
        handle,
        slug,
        title: project.title,
        description: project.description ?? null,
        url: project.url ?? null,
        repo: project.repo ?? null,
        tech: JSON.stringify(project.tech ?? []),
        coverImage: project.coverImage ?? null,
        gallery: JSON.stringify(project.gallery ?? []),
        featured: project.featured ?? false,
        sortOrder: project.order ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sumiProjects.handle, sumiProjects.slug],
        set: {
          title: project.title,
          description: project.description ?? null,
          url: project.url ?? null,
          repo: project.repo ?? null,
          tech: JSON.stringify(project.tech ?? []),
          coverImage: project.coverImage ?? null,
          gallery: JSON.stringify(project.gallery ?? []),
          featured: project.featured ?? false,
          sortOrder: project.order ?? 0,
          updatedAt: now,
        },
      });
    return slug;
  }

  async deleteProject(handle: string, slug: string): Promise<void> {
    await this.db
      .delete(sumiProjects)
      .where(sql`${sumiProjects.handle} = ${handle} AND ${sumiProjects.slug} = ${slug}`);
  }

  // ---- Independent pages (自定义独立页) ----

  async listPages(handle: string): Promise<PageMeta[]> {
    const rows = await this.db
      .select()
      .from(sumiPages)
      .where(sql`${sumiPages.handle} = ${handle}`)
      .orderBy(sql`${sumiPages.createdAt} DESC`);
    return rows.map((r) => toPageMeta(r));
  }

  async getPage(handle: string, slug: string): Promise<Page | null> {
    const rows = await this.db
      .select()
      .from(sumiPages)
      .where(sql`${sumiPages.handle} = ${handle} AND ${sumiPages.slug} = ${slug}`)
      .limit(1);
    return rows.length ? toPage(rows[0]) : null;
  }

  async savePage(handle: string, page: NewPage): Promise<string> {
    const slug = slugify(page.title);
    const now = new Date().toISOString();
    await this.db
      .insert(sumiPages)
      .values({
        handle,
        slug,
        title: page.title,
        description: page.description ?? null,
        body: page.body,
        showInNav: page.showInNav ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sumiPages.handle, sumiPages.slug],
        set: {
          title: page.title,
          description: page.description ?? null,
          body: page.body,
          showInNav: page.showInNav ?? false,
          updatedAt: now,
        },
      });
    return slug;
  }

  async deletePage(handle: string, slug: string): Promise<void> {
    await this.db
      .delete(sumiPages)
      .where(sql`${sumiPages.handle} = ${handle} AND ${sumiPages.slug} = ${slug}`);
  }

  // ---- Notifications ----

  async listNotifications(handle: string): Promise<Notification[]> {
    const rows = await this.db
      .select()
      .from(sumiNotifications)
      .where(sql`${sumiNotifications.handle} = ${handle}`)
      .orderBy(sql`${sumiNotifications.date} DESC`)
      .limit(100);
    return rows.map((r) => toNotification(r));
  }

  async addNotification(handle: string, notification: NewNotification, now: Date): Promise<Notification> {
    const id = `ntf-${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    const full: Notification = { id, handle, date: now.toISOString(), read: false, ...notification };
    await this.db.insert(sumiNotifications).values({
      id,
      handle,
      type: full.type,
      actor: full.actor,
      postHandle: full.postHandle ?? null,
      postSlug: full.postSlug ?? null,
      commentId: full.commentId ?? null,
      body: full.body ?? null,
      date: full.date,
      read: false,
      createdAt: now.toISOString(),
    });
    return full;
  }

  async markNotificationsRead(handle: string): Promise<number> {
    const rows = await this.db
      .update(sumiNotifications)
      .set({ read: true })
      .where(sql`${sumiNotifications.handle} = ${handle} AND ${sumiNotifications.read} = false`)
      .returning({ id: sumiNotifications.id });
    return rows.length;
  }

  // ---- Tags ----

  async listTags(): Promise<TagInfo[]> {
    const rows = await this.db
      .select({ tags: sumiPosts.tags })
      .from(sumiPosts)
      .where(sql`${sumiPosts.status} = 'published'`);
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const raw of parseJsonList(row.tags)) {
        const name = raw.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  // ---- Search ----

  async searchPosts(query: string): Promise<SearchResult[]> {
    const needle = query.trim();
    if (!needle) return [];
    const like = `%${needle}%`;
    const candidates = await this.db
      .select()
      .from(sumiPosts)
      .where(
        sql`${sumiPosts.status} = 'published' AND (
          ${sumiPosts.title} ILIKE ${like}
          OR ${sumiPosts.body} ILIKE ${like}
          OR ${sumiPosts.excerpt} ILIKE ${like}
          OR ${sumiPosts.tags} ILIKE ${like}
        )`,
      );
    return rankRows(
      candidates.map((r) => ({
        row: r,
        rank: {
          title: r.title,
          body: r.body,
          excerpt: r.excerpt,
          tags: parseJsonList(r.tags),
          publishedAt: r.publishedAt,
          createdAt: r.createdAt,
        },
      })),
      needle,
    ).map(({ row }) => ({ handle: row.handle, post: toPostMeta(row) }));
  }
}

function toPostMeta(r: PostRow): PostMeta {
  return {
    title: r.title,
    slug: r.slug,
    tags: parseJsonList(r.tags),
    status: r.status as PostStatus,
    ...(r.excerpt !== null ? { excerpt: r.excerpt } : {}),
    ...(r.coverImage !== null ? { coverImage: r.coverImage } : {}),
    ...(r.publishedAt !== null ? { publishedAt: r.publishedAt } : {}),
    ...(r.agent ? { agent: true } : {}),
  };
}

function toPost(r: PostRow): Post {
  return { ...toPostMeta(r), body: r.body };
}

function toMagazine(r: MagazineRow): Magazine {
  return {
    slug: r.slug,
    title: r.title,
    items: parseJsonList(r.items),
    ...(r.description !== null ? { description: r.description } : {}),
  };
}

function toProject(r: ProjectRow): Project {
  return {
    slug: r.slug,
    handle: r.handle,
    title: r.title,
    tech: parseJsonList(r.tech),
    featured: r.featured,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.description !== null ? { description: r.description } : {}),
    ...(r.url !== null ? { url: r.url } : {}),
    ...(r.repo !== null ? { repo: r.repo } : {}),
    ...(r.coverImage !== null ? { coverImage: r.coverImage } : {}),
    ...(r.gallery !== null && r.gallery.length > 0 ? { gallery: parseJsonList(r.gallery) } : {}),
    ...(r.sortOrder !== 0 ? { order: r.sortOrder } : {}),
  };
}

function toPageMeta(r: PageRow): PageMeta {
  return {
    slug: r.slug,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.description !== null ? { description: r.description } : {}),
    ...(r.showInNav ? { showInNav: true } : {}),
  };
}

function toPage(r: PageRow): Page {
  return { ...toPageMeta(r), handle: r.handle, body: r.body };
}

function toNotification(r: NotificationRow): Notification {
  const type = r.type;
  if (type !== "comment" && type !== "reply" && type !== "like" && type !== "follow" && type !== "ai") {
    // Defensive: DB rows with an unknown type should not crash the list page.
    return {
      id: r.id,
      handle: r.handle,
      actor: r.actor,
      date: r.date,
      read: r.read,
      type: "comment",
    };
  }
  return {
    id: r.id,
    handle: r.handle,
    type,
    actor: r.actor,
    date: r.date,
    read: r.read,
    ...(r.postHandle !== null ? { postHandle: r.postHandle } : {}),
    ...(r.postSlug !== null ? { postSlug: r.postSlug } : {}),
    ...(r.commentId !== null ? { commentId: r.commentId } : {}),
    ...(r.body !== null ? { body: r.body } : {}),
  };
}
