import type { GitHubClient } from "@/lib/github";
import type { ContentStore, ListPostsOptions } from "./store";
import type { NewPost, Post, PostMeta } from "./types";
import { parsePost, serializePost } from "./frontmatter";
import { CONTENT_DIR, imagePath, postDir, postFile, slugify, userDir } from "./paths";

export class GitHubContentStore implements ContentStore {
  constructor(private readonly client: GitHubClient) {}

  async getPost(handle: string, slug: string): Promise<Post | null> {
    const file = await this.client.getFile(postFile(handle, slug));
    if (!file) return null;
    return parsePost(file.content, slug);
  }

  /**
   * Create or overwrite a post. The slug is derived from the title, so editing a
   * post's title produces a NEW path and orphans the old file — callers that
   * support renames must deletePost(oldSlug) first (Plan 3 edit flow).
   */
  async savePost(handle: string, post: NewPost): Promise<string> {
    const slug = slugify(post.title);
    const full: Post = {
      title: post.title,
      slug,
      tags: post.tags ?? [],
      status: post.status ?? "draft",
      body: post.body,
      ...(post.excerpt !== undefined ? { excerpt: post.excerpt } : {}),
      ...(post.coverImage !== undefined ? { coverImage: post.coverImage } : {}),
      ...(post.publishedAt !== undefined ? { publishedAt: post.publishedAt } : {}),
    };
    const path = postFile(handle, slug);
    const existing = await this.client.getFile(path);
    await this.client.putTextFile(path, serializePost(full), `Save post: @${handle}/${slug}`, existing?.sha);
    return slug;
  }

  async deletePost(handle: string, slug: string): Promise<void> {
    await this.deleteTree(postDir(handle, slug));
  }

  async listPosts(opts: ListPostsOptions = {}): Promise<PostMeta[]> {
    const handles = opts.handle ? [opts.handle] : await this.listHandles();
    const out: PostMeta[] = [];
    for (const handle of handles) {
      const entries = await this.client.listDir(userDir(handle));
      for (const entry of entries) {
        if (entry.type !== "dir") continue;
        const post = await this.getPost(handle, entry.name);
        if (!post) continue;
        if (opts.status && post.status !== opts.status) continue;
        const { body: _body, ...meta } = post;
        void _body;
        out.push(meta);
      }
    }
    return out;
  }

  async uploadImage(handle: string, slug: string, filename: string, bytes: Uint8Array): Promise<string> {
    const path = imagePath(handle, slug, filename);
    const existing = await this.client.getFile(path);
    await this.client.putBinaryFile(path, bytes, `Upload image: ${filename}`, existing?.sha);
    return `images/${filename}`;
  }

  private async listHandles(): Promise<string[]> {
    const entries = await this.client.listDir(CONTENT_DIR);
    return entries.filter((e) => e.type === "dir" && e.name.startsWith("@")).map((e) => e.name.slice(1));
  }

  private async deleteTree(dir: string): Promise<void> {
    const entries = await this.client.listDir(dir);
    for (const entry of entries) {
      if (entry.type === "dir") {
        await this.deleteTree(entry.path);
      } else {
        const file = await this.client.getFile(entry.path);
        if (file) await this.client.deleteFile(entry.path, `Delete ${entry.path}`, file.sha);
      }
    }
  }
}
