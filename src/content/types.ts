export type PostStatus = "draft" | "published";

export interface PostMeta {
  title: string;
  slug: string;
  tags: string[];
  excerpt?: string;
  coverImage?: string;
  status: PostStatus;
  publishedAt?: string; // ISO 8601
  /** True when the post was authored by an autonomous agent. */
  agent?: boolean;
}

export interface Post extends PostMeta {
  body: string;
}

export interface NewPost {
  title: string;
  body: string;
  tags?: string[];
  excerpt?: string;
  coverImage?: string;
  status?: PostStatus;
  publishedAt?: string;
  agent?: boolean;
}

// ---- Comments ----

export interface NewComment {
  body: string;
  /** Optional parent comment id for nested/reply comments. */
  parentId?: string;
}

export interface Comment extends NewComment {
  id: string; // stable comment id (used as the parent reference)
  handle: string; // author handle
  date: string; // ISO 8601
}

// ---- Magazines (collections) ----

export interface NewMagazine {
  title: string;
  description?: string;
  items?: string[]; // post slugs, in display order
}

export interface Magazine extends NewMagazine {
  slug: string;
}

// ---- Profile ----

export interface Profile {
  displayName?: string;
  bio?: string;
}

// ---- Notes (手记 timeline) ----

export interface NewNote {
  body: string;
}

export interface Note extends NewNote {
  id: string; // stable note id
  handle: string; // author handle
  date: string; // ISO 8601
}

// ---- Friends (友链) ----

export interface NewFriend {
  name: string;
  url: string;
  avatar?: string;
  bio?: string;
}

export interface Friend extends NewFriend {
  id: string;
  createdAt: string; // ISO 8601
}

// ---- Projects (showcase) ----

export interface NewProject {
  title: string;
  description?: string;
  url?: string;
  repo?: string;
  tech?: string[];
  coverImage?: string;
  /** Extra screenshots / gallery images for the project card and lightbox. */
  gallery?: string[];
  featured?: boolean;
  /** Lower number sorts first within the same featured tier. */
  order?: number;
}

export interface Project extends NewProject {
  slug: string;
  handle: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ---- Independent pages (自定义独立页) ----

export interface NewPage {
  title: string;
  description?: string;
  body: string;
  showInNav?: boolean;
}

export interface PageMeta {
  slug: string;
  title: string;
  description?: string;
  showInNav?: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Page extends PageMeta {
  handle: string;
  body: string;
}

// ---- Notifications ----

export type NotificationType = "comment" | "reply" | "like" | "follow" | "ai";

export interface NewNotification {
  type: NotificationType;
  /** Handle of the person who triggered the event. */
  actor: string;
  postHandle?: string;
  postSlug?: string;
  commentId?: string;
  /** Short snippet, e.g. the comment body. */
  body?: string;
}

export interface Notification extends NewNotification {
  id: string;
  /** Recipient handle. */
  handle: string;
  date: string; // ISO 8601
  read: boolean;
}
