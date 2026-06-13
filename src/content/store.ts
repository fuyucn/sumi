import type { Post, PostMeta, NewPost, PostStatus } from "./types";

export interface ListPostsOptions {
  handle?: string;
  status?: PostStatus;
}

export interface ContentStore {
  /** All creator handles that have content. */
  listHandles(): Promise<string[]>;
  listPosts(opts?: ListPostsOptions): Promise<PostMeta[]>;
  getPost(handle: string, slug: string): Promise<Post | null>;
  savePost(handle: string, post: NewPost): Promise<string>;
  deletePost(handle: string, slug: string): Promise<void>;
  uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string>;
}
