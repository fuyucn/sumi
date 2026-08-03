import type { Comment, Magazine, NewComment, NewMagazine, Post, PostMeta, NewPost, PostStatus, Profile } from "./types";

export interface ListPostsOptions {
  handle?: string;
  status?: PostStatus;
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface ContentStore {
  /** All creator handles that have content. */
  listHandles(): Promise<string[]>;
  listPosts(opts?: ListPostsOptions): Promise<PostMeta[]>;
  getPost(handle: string, slug: string): Promise<Post | null>;
  savePost(handle: string, post: NewPost): Promise<string>;
  deletePost(handle: string, slug: string): Promise<void>;
  uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string>;
  listComments(postHandle: string, slug: string): Promise<Comment[]>;
  addComment(postHandle: string, slug: string, comment: NewComment, authorHandle: string, now: Date): Promise<Comment>;
  getProfile(handle: string): Promise<Profile | null>;
  saveProfile(handle: string, profile: Profile): Promise<void>;
  listMagazines(handle: string): Promise<Magazine[]>;
  getMagazine(handle: string, slug: string): Promise<Magazine | null>;
  saveMagazine(handle: string, magazine: NewMagazine): Promise<string>;
  deleteMagazine(handle: string, slug: string): Promise<void>;
  /** All tags in use (published posts) with their post counts, most-used first. */
  listTags(): Promise<TagInfo[]>;
}
