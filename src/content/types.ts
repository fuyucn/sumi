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
