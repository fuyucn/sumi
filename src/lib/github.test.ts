import { expect, test, vi } from "vitest";
import { makeGitHubClient } from "./github";

function fakeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    repos: {
      getContent: vi.fn(),
      createOrUpdateFileContents: vi.fn().mockResolvedValue({}),
      deleteFile: vi.fn().mockResolvedValue({}),
      ...overrides,
    },
  };
}

test("getFile decodes base64 content and returns sha; null on 404", async () => {
  const okt = fakeOctokit({
    getContent: vi
      .fn()
      .mockResolvedValueOnce({
        data: { type: "file", content: Buffer.from("hello", "utf8").toString("base64"), sha: "abc" },
      })
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { status: 404 })),
  });
  const client = makeGitHubClient(okt as never, "alice/repo");
  const f = await client.getFile("content/x.md");
  expect(f).toEqual({ content: "hello", sha: "abc" });
  const missing = await client.getFile("content/none.md");
  expect(missing).toBeNull();
});

test("putTextFile base64-encodes and forwards sha for updates", async () => {
  const okt = fakeOctokit();
  const client = makeGitHubClient(okt as never, "alice/repo");
  await client.putTextFile("content/x.md", "body", "msg", "oldsha");
  expect(okt.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
    expect.objectContaining({
      owner: "alice",
      repo: "repo",
      path: "content/x.md",
      message: "msg",
      content: Buffer.from("body", "utf8").toString("base64"),
      sha: "oldsha",
    }),
  );
});
