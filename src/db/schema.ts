import { boolean, customType, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// drizzle-orm/pg-core has no built-in bytea helper; use a custom type so the
// DB mirror can store raw image bytes.
export const bytea = customType<{ data: Uint8Array; driverData: unknown }>({
  dataType() {
    return "bytea";
  },
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Sumi content mirror (DbContentStore) ----

// These tables optionally mirror the GitHub-published content into Postgres so a
// deployment can serve reads/search from SQL without touching GitHub. The
// ContentStore interface (`src/content/store.ts`) is shared across the GitHub,
// Cloudflare (D1) and Postgres (DbContentStore) backends.

export const sumiPosts = pgTable("sumi_posts", {
  handle: text("handle").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").notNull().default("[]"),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  status: text("status").notNull().default("draft"),
  publishedAt: text("published_at"),
  agent: boolean("agent").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [primaryKey({ columns: [t.handle, t.slug] })]);

export const sumiComments = pgTable("sumi_comments", {
  id: text("id").primaryKey(),
  postHandle: text("post_handle").notNull(),
  postSlug: text("post_slug").notNull(),
  authorHandle: text("author_handle").notNull(),
  body: text("body").notNull(),
  date: text("date").notNull(),
  parentId: text("parent_id"),
  createdAt: text("created_at").notNull(),
});

export const sumiMagazines = pgTable("sumi_magazines", {
  handle: text("handle").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  items: text("items").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [primaryKey({ columns: [t.handle, t.slug] })]);

export const sumiProfiles = pgTable("sumi_profiles", {
  handle: text("handle").primaryKey(),
  displayName: text("display_name"),
  bio: text("bio"),
  updatedAt: text("updated_at").notNull(),
});

// Images stored by the Postgres mirror backend (DbContentStore). The GitHub /
// Cloudflare backends own their own object stores; the DB mirror needs a home
// for agent/user-uploaded images so the whole publishing flow works on
// self-hosted Docker (DB_MIRROR=1) without GitHub/R2.
export const sumiImages = pgTable("sumi_images", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull(),
  slug: text("slug").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: text("created_at").notNull(),
});

// ---- Agent publishing (agent_keys) ----

// API keys that let an autonomous agent publish as its own creator handle.
// Only the SHA-256 hash is stored; the plaintext key is shown once at creation
// (scripts/create-agent.ts) and can never be recovered.
export const agentKeys = pgTable("agent_keys", {
  id: text("id").primaryKey(),
  agentHandle: text("agent_handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  keyHash: text("key_hash").notNull(),
  publicKey: text("public_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const schema = {
  user,
  session,
  account,
  verification,
  sumiPosts,
  sumiComments,
  sumiMagazines,
  sumiProfiles,
  sumiImages,
  agentKeys,
};
