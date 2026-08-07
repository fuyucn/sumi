import matter from "gray-matter";
import type { Post, PostMeta, PostStatus } from "./types";

export function serializePost(post: Post): string {
  const data: Record<string, unknown> = {
    title: post.title,
    tags: post.tags,
    status: post.status,
  };
  if (post.excerpt !== undefined) data.excerpt = post.excerpt;
  if (post.coverImage !== undefined) data.coverImage = post.coverImage;
  if (post.publishedAt !== undefined) data.publishedAt = post.publishedAt;
  if (post.agent) data.agent = true;
  return matter.stringify(post.body, data);
}

export function parsePost(md: string, slug: string): Post {
  const { data, content } = matter(md);
  const status: PostStatus = data.status === "published" ? "published" : "draft";
  const meta: PostMeta = {
    title: typeof data.title === "string" ? data.title : "",
    slug,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status,
    ...(typeof data.excerpt === "string" ? { excerpt: data.excerpt } : {}),
    ...(typeof data.coverImage === "string" ? { coverImage: data.coverImage } : {}),
    ...(typeof data.publishedAt === "string" ? { publishedAt: data.publishedAt } : {}),
    ...(data.agent === true ? { agent: true } : {}),
  };
  return { ...meta, body: content };
}

// ---- Comments ----

export function serializeComment(comment: {
  handle: string;
  date: string;
  body: string;
  parentId?: string;
}): string {
  const data: Record<string, unknown> = { author: comment.handle, date: comment.date };
  if (comment.parentId !== undefined && comment.parentId !== "") data.parent = comment.parentId;
  return matter.stringify(comment.body, data);
}

export function parseComment(
  md: string,
  id: string,
  fallbackDate: string,
): { id: string; handle: string; date: string; body: string; parentId?: string } {
  const { data, content } = matter(md);
  const out: { id: string; handle: string; date: string; body: string; parentId?: string } = {
    id,
    handle: typeof data.author === "string" && data.author ? data.author : id,
    date: typeof data.date === "string" ? data.date : fallbackDate,
    body: content,
  };
  if (typeof data.parent === "string" && data.parent) out.parentId = data.parent;
  return out;
}

// ---- Magazines ----

export function serializeMagazine(mag: { title: string; description?: string; items: string[] }): string {
  const data: Record<string, unknown> = { title: mag.title, items: mag.items };
  if (mag.description !== undefined) data.description = mag.description;
  return matter.stringify("", data);
}

export function parseMagazine(md: string, slug: string): { slug: string; title: string; description?: string; items: string[] } {
  const { data } = matter(md);
  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    ...(typeof data.description === "string" ? { description: data.description } : {}),
    items: Array.isArray(data.items) ? data.items.map(String) : [],
  };
}

// ---- Profile ----

export function serializeProfile(profile: { displayName?: string; bio?: string }): string {
  const data: Record<string, unknown> = {};
  if (profile.displayName !== undefined && profile.displayName !== "") data.displayName = profile.displayName;
  if (profile.bio !== undefined && profile.bio !== "") data.bio = profile.bio;
  return matter.stringify("", data);
}

export function parseProfile(md: string): { displayName?: string; bio?: string } {
  const { data } = matter(md);
  const out: { displayName?: string; bio?: string } = {};
  if (typeof data.displayName === "string" && data.displayName) out.displayName = data.displayName;
  if (typeof data.bio === "string" && data.bio) out.bio = data.bio;
  return out;
}

// ---- Notes (手记) ----

export function serializeNote(note: { handle: string; date: string; body: string }): string {
  return matter.stringify(note.body, { author: note.handle, date: note.date });
}

export function parseNote(
  md: string,
  id: string,
  fallbackDate: string,
): { id: string; handle: string; date: string; body: string } {
  const { data, content } = matter(md);
  return {
    id,
    handle: typeof data.author === "string" && data.author ? data.author : id,
    date: typeof data.date === "string" ? data.date : fallbackDate,
    body: content.trim(),
  };
}

// ---- Projects (showcase) ----

export function serializeProject(project: {
  slug: string;
  handle: string;
  title: string;
  description?: string;
  url?: string;
  repo?: string;
  tech?: string[];
  coverImage?: string;
  featured?: boolean;
  order?: number;
  createdAt: string;
  updatedAt: string;
}): string {
  const data: Record<string, unknown> = {
    title: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  if (project.description) data.description = project.description;
  if (project.url) data.url = project.url;
  if (project.repo) data.repo = project.repo;
  if (project.tech && project.tech.length > 0) data.tech = project.tech;
  if (project.coverImage) data.coverImage = project.coverImage;
  if (project.featured) data.featured = true;
  if (project.order !== undefined && project.order !== 0) data.order = project.order;
  return matter.stringify("", data);
}

export function parseProject(
  md: string,
  slug: string,
  handle: string,
): {
  slug: string;
  handle: string;
  title: string;
  description?: string;
  url?: string;
  repo?: string;
  tech?: string[];
  coverImage?: string;
  featured?: boolean;
  order?: number;
  createdAt: string;
  updatedAt: string;
} {
  const { data } = matter(md);
  return {
    slug,
    handle,
    title: typeof data.title === "string" ? data.title : slug,
    ...(typeof data.description === "string" ? { description: data.description } : {}),
    ...(typeof data.url === "string" ? { url: data.url } : {}),
    ...(typeof data.repo === "string" ? { repo: data.repo } : {}),
    ...(Array.isArray(data.tech) ? { tech: data.tech.map(String) } : {}),
    ...(typeof data.coverImage === "string" ? { coverImage: data.coverImage } : {}),
    ...(data.featured === true ? { featured: true } : {}),
    ...(typeof data.order === "number" ? { order: data.order } : {}),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

// ---- Independent pages (自定义独立页) ----

export function serializePage(page: {
  slug: string;
  handle: string;
  title: string;
  description?: string;
  showInNav?: boolean;
  body: string;
  createdAt: string;
  updatedAt: string;
}): string {
  const data: Record<string, unknown> = {
    title: page.title,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
  if (page.description) data.description = page.description;
  if (page.showInNav) data.showInNav = true;
  return matter.stringify(page.body, data);
}

export function parsePageMeta(
  md: string,
  slug: string,
): {
  slug: string;
  title: string;
  description?: string;
  showInNav?: boolean;
  createdAt: string;
  updatedAt: string;
} {
  const { data } = matter(md);
  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    ...(typeof data.description === "string" ? { description: data.description } : {}),
    ...(data.showInNav === true ? { showInNav: true } : {}),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

export function parsePage(
  md: string,
  slug: string,
  handle: string,
): {
  slug: string;
  handle: string;
  title: string;
  description?: string;
  showInNav?: boolean;
  body: string;
  createdAt: string;
  updatedAt: string;
} {
  const { data, content } = matter(md);
  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    ...(typeof data.description === "string" ? { description: data.description } : {}),
    ...(data.showInNav === true ? { showInNav: true } : {}),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    handle,
    body: content.trimEnd(),
  };
}
