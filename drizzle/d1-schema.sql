-- Sumi content schema for Cloudflare D1 (SQLite dialect).
--
-- The Cloudflare ContentStore (`src/content/cloudflare-content-store.ts`) reads
-- and writes these tables. Apply them to a remote/local D1 database with:
--
--   pnpm dlx wrangler d1 execute sumi-db --remote --file=drizzle/d1-schema.sql
--
-- `drizzle/*.sql` migrations are Postgres dialect (for Neon/Docker) and are NOT
-- compatible with D1 — keep this file as the single source of truth for the
-- Cloudflare content layer.

CREATE TABLE IF NOT EXISTS posts (
  handle TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  excerpt TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (handle, slug)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_handle TEXT NOT NULL,
  post_slug TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  body TEXT NOT NULL,
  date TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  post_handle TEXT NOT NULL,
  post_slug TEXT NOT NULL,
  liker_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_handle, post_slug, liker_handle)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_handle TEXT NOT NULL,
  followee_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_handle, followee_handle)
);

CREATE TABLE IF NOT EXISTS magazines (
  handle TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (handle, slug)
);

CREATE TABLE IF NOT EXISTS profiles (
  handle TEXT PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  body TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  handle TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  repo TEXT,
  tech TEXT NOT NULL DEFAULT '[]',
  cover_image TEXT,
  gallery TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (handle, slug)
);

CREATE TABLE IF NOT EXISTS pages (
  handle TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  body TEXT NOT NULL,
  show_in_nav INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (handle, slug)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  post_handle TEXT,
  post_slug TEXT,
  comment_id TEXT,
  body TEXT,
  date TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
