import { Octokit } from "@octokit/rest";

export interface RepoFile {
  content: string; // UTF-8 decoded
  sha: string;
}
export interface DirEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface GitHubClient {
  getFile(path: string): Promise<RepoFile | null>;
  listDir(path: string): Promise<DirEntry[]>;
  putTextFile(path: string, text: string, message: string, sha?: string): Promise<void>;
  putBinaryFile(path: string, bytes: Uint8Array, message: string, sha?: string): Promise<void>;
  deleteFile(path: string, message: string, sha: string): Promise<void>;
}

function splitRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

function isStatus(err: unknown, code: number): boolean {
  return typeof err === "object" && err !== null && (err as { status?: number }).status === code;
}

export function makeGitHubClient(octokit: Octokit, repo: string): GitHubClient {
  const { owner, repo: name } = splitRepo(repo);
  return {
    async getFile(path) {
      try {
        const res = await octokit.repos.getContent({ owner, repo: name, path });
        const data = res.data as { type?: string; content?: string; sha: string };
        if (data.type !== "file" || typeof data.content !== "string") return null;
        return { content: Buffer.from(data.content, "base64").toString("utf8"), sha: data.sha };
      } catch (err) {
        if (isStatus(err, 404)) return null;
        throw err;
      }
    },
    async listDir(path) {
      try {
        const res = await octokit.repos.getContent({ owner, repo: name, path });
        if (!Array.isArray(res.data)) return [];
        return res.data.map((e) => ({ name: e.name, path: e.path, type: e.type === "dir" ? ("dir" as const) : ("file" as const) }));
      } catch (err) {
        if (isStatus(err, 404)) return [];
        throw err;
      }
    },
    async putTextFile(path, text, message, sha) {
      await octokit.repos.createOrUpdateFileContents({
        owner, repo: name, path, message,
        content: Buffer.from(text, "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
      });
    },
    async putBinaryFile(path, bytes, message, sha) {
      await octokit.repos.createOrUpdateFileContents({
        owner, repo: name, path, message,
        content: Buffer.from(bytes).toString("base64"),
        ...(sha ? { sha } : {}),
      });
    },
    async deleteFile(path, message, sha) {
      await octokit.repos.deleteFile({ owner, repo: name, path, message, sha });
    },
  };
}

export function githubClientFromToken(token: string, repo: string): GitHubClient {
  return makeGitHubClient(new Octokit({ auth: token }), repo);
}
