import type { GitHubClient } from "@/lib/github";
import type { ContentStore, ListPostsOptions, SearchResult, TagInfo } from "./store";
import type { Comment, Friend, Magazine, NewComment, NewFriend, NewMagazine, NewNote, NewNotification, NewPage, NewPost, NewProject, Note, Notification, Page, PageMeta, Post, PostMeta, Profile, Project } from "./types";
import {
  parseComment,
  parseMagazine,
  parseNote,
  parsePage,
  parsePageMeta,
  parsePost,
  parseProfile,
  parseProject,
  serializeComment,
  serializeMagazine,
  serializeNote,
  serializePage,
  serializePost,
  serializeProfile,
  serializeProject,
} from "./frontmatter";
import {
  CONTENT_DIR,
  commentDir,
  commentFile,
  followingFile,
  friendsFile,
  imagePath,
  likesFile,
  magazineFile,
  magazinesDir,
  noteFile,
  notesDir,
  notificationsFile,
  pageFile,
  pagesDir,
  postDir,
  postFile,
  profileFile,
  projectFile,
  projectsDir,
  safeCommentName,
  safeNoteName,
  slugify,
  userDir,
} from "./paths";
import { rankRows, type RankablePost } from "./search-rank";

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
      ...(post.agent ? { agent: true } : {}),
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

  // ---- Likes ----

  async listLikes(postHandle: string, slug: string): Promise<string[]> {
    const file = await this.client.getFile(likesFile(postHandle, slug));
    if (!file) return [];
    try {
      const parsed: { likes?: unknown } = JSON.parse(file.content);
      const arr = Array.isArray(parsed.likes) ? parsed.likes : null;
      return arr ? arr.filter((x: unknown): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  async addLike(postHandle: string, slug: string, likerHandle: string): Promise<void> {
    await this.writeLikes(postHandle, slug, (handles) =>
      handles.includes(likerHandle) ? handles : [...handles, likerHandle],
    );
  }

  async removeLike(postHandle: string, slug: string, likerHandle: string): Promise<void> {
    await this.writeLikes(postHandle, slug, (handles) =>
      handles.filter((h) => h !== likerHandle),
    );
  }

  private async writeLikes(
    postHandle: string,
    slug: string,
    update: (current: string[]) => string[],
  ): Promise<void> {
    const path = likesFile(postHandle, slug);
    const existing = await this.client.getFile(path);
    let handles: string[] = [];
    if (existing) {
      try {
        const parsed: { likes?: unknown } = JSON.parse(existing.content);
        if (Array.isArray(parsed.likes)) handles = parsed.likes.filter((x: unknown): x is string => typeof x === "string");
      } catch {
        /* treat unreadable likes file as empty */
      }
    }
    await this.client.putTextFile(
      path,
      JSON.stringify({ likes: update(handles) }, null, 2),
      `Like on @${postHandle}/${slug}`,
      existing?.sha,
    );
  }

  async listFollowers(handle: string): Promise<string[]> {
    const followers: string[] = [];
    for (const h of await this.listHandles()) {
      if (h === handle) continue;
      const following = await this.listFollowing(h);
      if (following.includes(handle)) followers.push(h);
    }
    return followers;
  }

  async listFollowing(handle: string): Promise<string[]> {
    const file = await this.client.getFile(followingFile(handle));
    if (!file) return [];
    try {
      const parsed: { following?: unknown } = JSON.parse(file.content);
      const arr = Array.isArray(parsed.following) ? parsed.following : null;
      return arr ? arr.filter((x: unknown): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  async addFollow(followerHandle: string, followeeHandle: string): Promise<void> {
    await this.writeFollowing(followerHandle, (handles) =>
      handles.includes(followeeHandle) ? handles : [...handles, followeeHandle],
    );
  }

  async removeFollow(followerHandle: string, followeeHandle: string): Promise<void> {
    await this.writeFollowing(followerHandle, (handles) =>
      handles.filter((h) => h !== followeeHandle),
    );
  }

  private async writeFollowing(
    handle: string,
    update: (current: string[]) => string[],
  ): Promise<void> {
    const path = followingFile(handle);
    const existing = await this.client.getFile(path);
    let handles: string[] = [];
    if (existing) {
      try {
        const parsed: { following?: unknown } = JSON.parse(existing.content);
        if (Array.isArray(parsed.following))
          handles = parsed.following.filter((x: unknown): x is string => typeof x === "string");
      } catch {
        /* treat unreadable following file as empty */
      }
    }
    await this.client.putTextFile(
      path,
      JSON.stringify({ following: update(handles) }, null, 2),
      `Follows for @${handle}`,
      existing?.sha,
    );
  }

  // ---- Comments ----

  async listComments(postHandle: string, slug: string): Promise<Comment[]> {
    const entries = await this.client.listDir(commentDir(postHandle, slug));
    const out: Comment[] = [];
    for (const entry of entries) {
      if (entry.type !== "file") continue;
      const file = await this.client.getFile(entry.path);
      if (!file) continue;
      const id = entry.name.endsWith(".md") ? entry.name.slice(0, -3) : entry.name;
      out.push(parseComment(file.content, id, ""));
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  }

  async addComment(postHandle: string, slug: string, comment: NewComment, authorHandle: string, now: Date): Promise<Comment> {
    const name = safeCommentName(now, authorHandle);
    const id = name.endsWith(".md") ? name.slice(0, -3) : name;
    const full: Comment = {
      id,
      handle: authorHandle,
      date: now.toISOString(),
      body: comment.body,
      ...(comment.parentId !== undefined ? { parentId: comment.parentId } : {}),
    };
    await this.client.putTextFile(
      commentFile(postHandle, slug, name),
      serializeComment(full),
      `Comment on @${postHandle}/${slug} by @${authorHandle}`,
    );
    return full;
  }

  async deleteComment(postHandle: string, slug: string, commentId: string): Promise<void> {
    const path = commentFile(postHandle, slug, `${commentId}.md`);
    const file = await this.client.getFile(path);
    if (!file) return;
    await this.client.deleteFile(
      path,
      `Delete comment @${postHandle}/${slug}/${commentId}`,
      file.sha,
    );
  }

  // ---- Profile ----

  async getProfile(handle: string): Promise<Profile | null> {
    const file = await this.client.getFile(profileFile(handle));
    if (!file) return null;
    return parseProfile(file.content);
  }

  async saveProfile(handle: string, profile: Profile): Promise<void> {
    const path = profileFile(handle);
    const existing = await this.client.getFile(path);
    await this.client.putTextFile(path, serializeProfile(profile), `Save profile: @${handle}`, existing?.sha);
  }

  // ---- Notes (手记) ----

  async listNotes(handle: string): Promise<Note[]> {
    let entries;
    try {
      entries = await this.client.listDir(notesDir(handle));
    } catch {
      return [];
    }
    const out: Note[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const file = await this.client.getFile(entry.path);
      if (!file) continue;
      const id = entry.name.slice(0, -3);
      out.push(parseNote(file.content, id, ""));
    }
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }

  async addNote(handle: string, note: NewNote, now: Date): Promise<Note> {
    const id = safeNoteName(now, handle);
    const full: Note = { id, handle, date: now.toISOString(), body: note.body };
    await this.client.putTextFile(
      noteFile(handle, id),
      serializeNote(full),
      `Note on @${handle} by @${handle}`,
    );
    return full;
  }

  async deleteNote(handle: string, id: string): Promise<void> {
    const path = noteFile(handle, id);
    const file = await this.client.getFile(path);
    if (!file) return;
    await this.client.deleteFile(path, `Delete note @${handle}/${id}`, file.sha);
  }

  // ---- Friends (友链) ----

  async listFriends(): Promise<Friend[]> {
    const file = await this.client.getFile(friendsFile());
    if (!file) return [];
    try {
      const parsed: { friends?: unknown } = JSON.parse(file.content);
      const arr = Array.isArray(parsed.friends) ? parsed.friends : null;
      if (!arr) return [];
      return arr
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((x) => ({
          id: typeof x.id === "string" ? x.id : "",
          name: typeof x.name === "string" ? x.name : "",
          url: typeof x.url === "string" ? x.url : "",
          ...(typeof x.avatar === "string" && x.avatar ? { avatar: x.avatar } : {}),
          ...(typeof x.bio === "string" && x.bio ? { bio: x.bio } : {}),
          createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
        }))
        .filter((f) => f.id && f.name && f.url);
    } catch {
      return [];
    }
  }

  async addFriend(friend: NewFriend, now: Date): Promise<Friend> {
    const full: Friend = {
      id: `${now.toISOString().replace(/[:.]/g, "-")}-${slugify(friend.name) || "friend"}`,
      name: friend.name,
      url: friend.url,
      ...(friend.avatar !== undefined ? { avatar: friend.avatar } : {}),
      ...(friend.bio !== undefined ? { bio: friend.bio } : {}),
      createdAt: now.toISOString(),
    };
    await this.writeFriends((friends) => [...friends, full]);
    return full;
  }

  async deleteFriend(id: string): Promise<void> {
    await this.writeFriends((friends) => friends.filter((f) => f.id !== id));
  }

  private async writeFriends(update: (current: Friend[]) => Friend[]): Promise<void> {
    const path = friendsFile();
    const existing = await this.client.getFile(path);
    const current = existing ? await this.listFriends() : [];
    await this.client.putTextFile(
      path,
      JSON.stringify({ friends: update(current) }, null, 2),
      `Update friend links`,
      existing?.sha,
    );
  }

  // ---- Magazines ----

  async listMagazines(handle: string): Promise<Magazine[]> {
    const entries = await this.client.listDir(magazinesDir(handle));
    const out: Magazine[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const slug = entry.name.slice(0, -3);
      const mag = await this.getMagazine(handle, slug);
      if (mag) out.push(mag);
    }
    return out;
  }

  async getMagazine(handle: string, slug: string): Promise<Magazine | null> {
    const file = await this.client.getFile(magazineFile(handle, slug));
    if (!file) return null;
    return parseMagazine(file.content, slug);
  }

  async saveMagazine(handle: string, magazine: NewMagazine): Promise<string> {
    const slug = slugify(magazine.title);
    const full: Magazine = {
      slug,
      title: magazine.title,
      items: magazine.items ?? [],
      ...(magazine.description !== undefined ? { description: magazine.description } : {}),
    };
    const path = magazineFile(handle, slug);
    const existing = await this.client.getFile(path);
    await this.client.putTextFile(path, serializeMagazine({ ...full, items: full.items ?? [] }), `Save magazine: @${handle}/${slug}`, existing?.sha);
    return slug;
  }

  async deleteMagazine(handle: string, slug: string): Promise<void> {
    const path = magazineFile(handle, slug);
    const existing = await this.client.getFile(path);
    if (existing) await this.client.deleteFile(path, `Delete magazine: @${handle}/${slug}`, existing.sha);
  }

  // ---- Projects (showcase) ----

  async listProjects(handle: string): Promise<Project[]> {
    let entries;
    try {
      entries = await this.client.listDir(projectsDir(handle));
    } catch {
      return [];
    }
    const out: Project[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const file = await this.client.getFile(entry.path);
      if (!file) continue;
      out.push(parseProject(file.content, entry.name.slice(0, -3), handle));
    }
    out.sort(
      (a, b) =>
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
        (a.order ?? 99) - (b.order ?? 99) ||
        a.title.localeCompare(b.title),
    );
    return out;
  }

  async getProject(handle: string, slug: string): Promise<Project | null> {
    const file = await this.client.getFile(projectFile(handle, slug));
    if (!file) return null;
    return parseProject(file.content, slug, handle);
  }

  async saveProject(handle: string, project: NewProject): Promise<string> {
    const slug = slugify(project.title);
    const path = projectFile(handle, slug);
    const existing = await this.client.getFile(path);
    const existingProject = existing ? parseProject(existing.content, slug, handle) : null;
    const now = new Date().toISOString();
    const full: Project = {
      slug,
      handle,
      title: project.title,
      createdAt: existingProject?.createdAt || now,
      updatedAt: now,
      ...(project.description !== undefined && project.description ? { description: project.description } : {}),
      ...(project.url !== undefined && project.url ? { url: project.url } : {}),
      ...(project.repo !== undefined && project.repo ? { repo: project.repo } : {}),
      ...(project.tech && project.tech.length > 0 ? { tech: project.tech } : {}),
      ...(project.coverImage !== undefined && project.coverImage ? { coverImage: project.coverImage } : {}),
      ...(project.gallery && project.gallery.length > 0 ? { gallery: project.gallery } : {}),
      ...(project.featured ? { featured: true } : {}),
      ...(project.order !== undefined && project.order !== 0 ? { order: project.order } : {}),
    };
    await this.client.putTextFile(path, serializeProject(full), `Save project: @${handle}/${slug}`, existing?.sha);
    return slug;
  }

  async deleteProject(handle: string, slug: string): Promise<void> {
    const path = projectFile(handle, slug);
    const existing = await this.client.getFile(path);
    if (existing) await this.client.deleteFile(path, `Delete project: @${handle}/${slug}`, existing.sha);
  }

  // ---- Independent pages (自定义独立页) ----

  async listPages(handle: string): Promise<PageMeta[]> {
    let entries;
    try {
      entries = await this.client.listDir(pagesDir(handle));
    } catch {
      return [];
    }
    const out: PageMeta[] = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      const file = await this.client.getFile(entry.path);
      if (!file) continue;
      out.push(parsePageMeta(file.content, entry.name.slice(0, -3)));
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title));
    return out;
  }

  async getPage(handle: string, slug: string): Promise<Page | null> {
    const file = await this.client.getFile(pageFile(handle, slug));
    if (!file) return null;
    return parsePage(file.content, slug, handle);
  }

  async savePage(handle: string, page: NewPage): Promise<string> {
    const slug = slugify(page.title);
    const path = pageFile(handle, slug);
    const existing = await this.client.getFile(path);
    const existingPage = existing ? parsePage(existing.content, slug, handle) : null;
    const now = new Date().toISOString();
    const full: Page = {
      slug,
      handle,
      title: page.title,
      body: page.body,
      createdAt: existingPage?.createdAt || now,
      updatedAt: now,
      ...(page.description !== undefined && page.description ? { description: page.description } : {}),
      ...(page.showInNav ? { showInNav: true } : {}),
    };
    await this.client.putTextFile(path, serializePage(full), `Save page: @${handle}/${slug}`, existing?.sha);
    return slug;
  }

  async deletePage(handle: string, slug: string): Promise<void> {
    const path = pageFile(handle, slug);
    const existing = await this.client.getFile(path);
    if (existing) await this.client.deleteFile(path, `Delete page: @${handle}/${slug}`, existing.sha);
  }

  // ---- Notifications ----

  async listNotifications(handle: string): Promise<Notification[]> {
    const file = await this.client.getFile(notificationsFile(handle));
    if (!file) return [];
    try {
      const parsed: { notifications?: unknown } = JSON.parse(file.content);
      const arr = Array.isArray(parsed.notifications) ? parsed.notifications : null;
      if (!arr) return [];
      return arr
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((x) => parseNotification(x))
        .filter((n): n is Notification => n !== null)
        .sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  }

  async addNotification(handle: string, notification: NewNotification, now: Date): Promise<Notification> {
    const full: Notification = {
      id: `ntf-${now.toISOString().replace(/[:.]/g, "-")}`,
      handle,
      date: now.toISOString(),
      read: false,
      ...notification,
    };
    await this.writeNotifications(handle, (current) => [full, ...current].slice(0, MAX_NOTIFICATIONS));
    return full;
  }

  async markNotificationsRead(handle: string): Promise<number> {
    let marked = 0;
    await this.writeNotifications(handle, (current) =>
      current.map((n) => {
        if (n.read) return n;
        marked += 1;
        return { ...n, read: true };
      }),
    );
    return marked;
  }

  private async writeNotifications(
    handle: string,
    update: (current: Notification[]) => Notification[],
  ): Promise<void> {
    const path = notificationsFile(handle);
    const existing = await this.client.getFile(path);
    const current = existing ? await this.listNotifications(handle) : [];
    await this.client.putTextFile(
      path,
      JSON.stringify({ notifications: update(current) }, null, 2),
      `Update notifications for @${handle}`,
      existing?.sha,
    );
  }

  async listTags(): Promise<TagInfo[]> {
    const counts = new Map<string, number>();
    for (const handle of await this.listHandles()) {
      for (const meta of await this.listPosts({ handle, status: "published" })) {
        for (const raw of meta.tags) {
          const name = raw.trim();
          if (!name) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async searchPosts(query: string): Promise<SearchResult[]> {
    const needle = query.trim();
    if (!needle) return [];
    const includeCandidates: Array<{ row: Post; rank: RankablePost; handle: string }> = [];
    for (const handle of await this.listHandles()) {
      for (const meta of await this.listPosts({ handle, status: "published" })) {
        const post = await this.getPost(handle, meta.slug);
        if (!post) continue;
        const haystack = [post.title, post.body, post.excerpt ?? "", post.tags.join(" ")]
          .join("\n")
          .toLowerCase();
        if (haystack.includes(needle.toLowerCase()))
          includeCandidates.push({ row: post, rank: post, handle });
      }
    }
    return rankRows(includeCandidates, needle).map(({ row, handle }) => {
      const { body: _body, ...m } = row;
      void _body;
      return { handle, post: m };
    });
  }

  async listHandles(): Promise<string[]> {
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

const MAX_NOTIFICATIONS = 100;

function parseNotification(x: Record<string, unknown>): Notification | null {
  const id = typeof x.id === "string" ? x.id : "";
  const handle = typeof x.handle === "string" ? x.handle : "";
  const actor = typeof x.actor === "string" ? x.actor : "";
  const date = typeof x.date === "string" ? x.date : "";
  const type = x.type;
  if (!id || !handle || !actor || !date || (type !== "comment" && type !== "reply" && type !== "like" && type !== "follow")) {
    return null;
  }
  return {
    id,
    handle,
    actor,
    date,
    read: x.read === true,
    type,
    ...(typeof x.postHandle === "string" && x.postHandle ? { postHandle: x.postHandle } : {}),
    ...(typeof x.postSlug === "string" && x.postSlug ? { postSlug: x.postSlug } : {}),
    ...(typeof x.commentId === "string" && x.commentId ? { commentId: x.commentId } : {}),
    ...(typeof x.body === "string" && x.body ? { body: x.body } : {}),
  };
}
