import type { Comment, Friend, Magazine, NewComment, NewFriend, NewMagazine, NewNote, NewPage, NewPost, NewProject, Note, Page, PageMeta, Post, PostMeta, PostStatus, Profile, Project } from "./types";

export interface ListPostsOptions {
  handle?: string;
  status?: PostStatus;
}

export interface TagInfo {
  name: string;
  count: number;
}

/** A search hit: the owning handle plus the published post metadata. */
export interface SearchResult {
  handle: string;
  post: PostMeta;
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
  /** Remove a single comment (by its id) from a post. */
  deleteComment(postHandle: string, slug: string, commentId: string): Promise<void>;
  /** Handles that liked a post (no particular order). */
  listLikes(postHandle: string, slug: string): Promise<string[]>;
  addLike(postHandle: string, slug: string, likerHandle: string, now: Date): Promise<void>;
  removeLike(postHandle: string, slug: string, likerHandle: string): Promise<void>;
  /** Handles that follow the given creator (followers of `handle`). */
  listFollowers(handle: string): Promise<string[]>;
  /** Handles the given user is following. */
  listFollowing(handle: string): Promise<string[]>;
  addFollow(followerHandle: string, followeeHandle: string, now: Date): Promise<void>;
  removeFollow(followerHandle: string, followeeHandle: string): Promise<void>;
  getProfile(handle: string): Promise<Profile | null>;
  saveProfile(handle: string, profile: Profile): Promise<void>;
  /** Notes (手记) for a creator, newest first. */
  listNotes(handle: string): Promise<Note[]>;
  addNote(handle: string, note: NewNote, now: Date): Promise<Note>;
  deleteNote(handle: string, id: string): Promise<void>;
  /** Site-wide friend links (友链), in creation order. */
  listFriends(): Promise<Friend[]>;
  addFriend(friend: NewFriend, now: Date): Promise<Friend>;
  deleteFriend(id: string): Promise<void>;
  listMagazines(handle: string): Promise<Magazine[]>;
  getMagazine(handle: string, slug: string): Promise<Magazine | null>;
  saveMagazine(handle: string, magazine: NewMagazine): Promise<string>;
  deleteMagazine(handle: string, slug: string): Promise<void>;
  /** Projects for a creator, featured first then by order. */
  listProjects(handle: string): Promise<Project[]>;
  getProject(handle: string, slug: string): Promise<Project | null>;
  saveProject(handle: string, project: NewProject): Promise<string>;
  deleteProject(handle: string, slug: string): Promise<void>;
  /** Independent pages for a creator, newest first. */
  listPages(handle: string): Promise<PageMeta[]>;
  getPage(handle: string, slug: string): Promise<Page | null>;
  savePage(handle: string, page: NewPage): Promise<string>;
  deletePage(handle: string, slug: string): Promise<void>;
  /** All tags in use (published posts) with their post counts, most-used first. */
  listTags(): Promise<TagInfo[]>;
  /** Full-text search across published posts (title, body, excerpt, tags). Newest first. */
  searchPosts(query: string): Promise<SearchResult[]>;
}
