import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Cloudflare D1 (SQLite) schema for Sumi content.
 *
 * Mirrors the shapes in `src/content/types.ts`. Compound columns (tags, magazine
 * items) are stored as JSON text arrays so they round-trip losslessly within a
 * single SQLite column.
 */

export const posts = sqliteTable(
  "posts",
  {
    handle: text("handle").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    tags: text("tags").notNull().default("[]"),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    status: text("status").notNull().default("draft"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.handle, t.slug] })],
);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postHandle: text("post_handle").notNull(),
  postSlug: text("post_slug").notNull(),
  authorHandle: text("author_handle").notNull(),
  body: text("body").notNull(),
  date: text("date").notNull(),
  parentId: text("parent_id"),
  createdAt: text("created_at").notNull(),
});

export const magazines = sqliteTable(
  "magazines",
  {
    handle: text("handle").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    items: text("items").notNull().default("[]"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.handle, t.slug] })],
);

export const profiles = sqliteTable("profiles", {
  handle: text("handle").primaryKey(),
  displayName: text("display_name"),
  bio: text("bio"),
  updatedAt: text("updated_at").notNull(),
});

export const schema = { posts, comments, magazines, profiles };
