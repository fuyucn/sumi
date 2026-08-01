export type PostStatus = "draft" | "published";

export interface PostMeta {
  title: string;
  slug: string;
  tags: string[];
  excerpt?: string;
  coverImage?: string;
  status: PostStatus;
  publishedAt?: string; // ISO 8601
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
}

// ---- Comments ----

export interface NewComment {
  body: string;
}

export interface Comment extends NewComment {
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
