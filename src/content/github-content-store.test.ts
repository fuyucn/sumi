import { expect, test } from "vitest";
import type { GitHubClient, RepoFile, DirEntry } from "@/lib/github";
import { GitHubContentStore } from "./github-content-store";

function fakeClient(): GitHubClient & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    async getFile(path): Promise<RepoFile | null> {
      return files.has(path) ? { content: files.get(path)!, sha: "sha-" + path } : null;
    },
    async listDir(path): Promise<DirEntry[]> {
      const prefix = path.endsWith("/") ? path : path + "/";
      const names = new Set<string>();
      const entries: DirEntry[] = [];
      for (const key of files.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const top = rest.split("/")[0];
        if (names.has(top)) continue;
        names.add(top);
        const isDir = rest.includes("/");
        entries.push({ name: top, path: prefix + top, type: isDir ? "dir" : "file" });
      }
      return entries;
    },
    async putTextFile(path, text) { files.set(path, text); },
    async putBinaryFile(path) { files.set(path, "<binary>"); },
    async deleteFile(path) { files.delete(path); },
  };
}

test("savePost writes index.md and getPost reads it back", async () => {
  const store = new GitHubContentStore(fakeClient());
  const slug = await store.savePost("alice", {
    title: "My First Post", body: "# Hi\n\nhello", tags: ["intro"],
    status: "published", publishedAt: "2026-06-12T00:00:00.000Z",
  });
  expect(slug).toBe("my-first-post");
  const post = await store.getPost("alice", "my-first-post");
  expect(post?.title).toBe("My First Post");
  expect(post?.tags).toEqual(["intro"]);
  expect(post?.body).toContain("hello");
});

test("getPost returns null for a missing post", async () => {
  const store = new GitHubContentStore(fakeClient());
  expect(await store.getPost("alice", "nope")).toBeNull();
});

test("listPosts returns metadata for a creator, filterable by status", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "One", body: "a", status: "published" });
  await store.savePost("alice", { title: "Two", body: "b", status: "draft" });
  const all = await store.listPosts({ handle: "alice" });
  expect(all.map((p) => p.slug).sort()).toEqual(["one", "two"]);
  const published = await store.listPosts({ handle: "alice", status: "published" });
  expect(published.map((p) => p.slug)).toEqual(["one"]);
});

test("uploadImage stores under images/ and returns the in-post relative path", async () => {
  const store = new GitHubContentStore(fakeClient());
  const rel = await store.uploadImage("alice", "my-post", "cover.png", new Uint8Array([1, 2, 3]));
  expect(rel).toBe("images/cover.png");
});

test("deletePost removes the post files", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "Bye", body: "x", status: "draft" });
  await store.deletePost("alice", "bye");
  expect(await store.getPost("alice", "bye")).toBeNull();
});

test("deletePost recurses into the images/ subdir and removes everything", async () => {
  const client = fakeClient();
  const store = new GitHubContentStore(client);
  await store.savePost("alice", { title: "With Image", body: "x", status: "draft" });
  await store.uploadImage("alice", "with-image", "cover.png", new Uint8Array([1, 2, 3]));
  // both the article file and the nested image exist
  expect([...client.files.keys()].some((k) => k.includes("/images/cover.png"))).toBe(true);

  await store.deletePost("alice", "with-image");

  // nothing under the post dir remains (recursive delete reached images/)
  const remaining = [...client.files.keys()].filter((k) => k.includes("content/@alice/with-image"));
  expect(remaining).toEqual([]);
});
