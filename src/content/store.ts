import type { Post, PostMeta, NewPost } from "./types";

export interface ListPostsOptions {
  handle?: string;
  status?: "draft" | "published";
}

export interface ContentStore {
  listPosts(opts?: ListPostsOptions): Promise<PostMeta[]>;
  getPost(handle: string, slug: string): Promise<Post | null>;
  savePost(handle: string, post: NewPost): Promise<string>;
  deletePost(handle: string, slug: string): Promise<void>;
  uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string>;
}
