import { beforeEach, expect, test, vi } from "vitest";
import { POST } from "./route";

const requestMock = vi.hoisted(() => vi.fn());
const getAgentContentStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/agent/shared", () => ({
  agentRequest: requestMock,
  apiError: (status: number, error: string) =>
    new Response(JSON.stringify({ ok: false, error }), { status }),
}));
vi.mock("@/content", () => ({ getAgentContentStore: getAgentContentStoreMock }));

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function req(body: unknown) {
  return { text: async () => JSON.stringify(body) } as unknown as Parameters<typeof POST>[0];
}

function authOk() {
  return { ok: true, agentHandle: "agent-test", displayName: "Test Agent" };
}

beforeEach(() => {
  requestMock.mockReset();
  getAgentContentStoreMock.mockReset();
});

/** Echo the real request body through the mocked auth gate. */
function withAuth() {
  requestMock.mockImplementation(async (r: { text: () => Promise<string> }) => ({
    auth: authOk(),
    body: await r.text(),
  }));
}

test("rejects when not authenticated", async () => {
  requestMock.mockResolvedValue({ auth: { ok: false, error: "unauthorized" }, body: "{}" });
  getAgentContentStoreMock.mockResolvedValue(null);
  const res = await POST(req({ title: "T", filename: "cover.png", data: PNG }));
  expect(res.status).toBe(401);
  expect(getAgentContentStoreMock).not.toHaveBeenCalled();
});

test("rejects missing data (schema)", async () => {
  withAuth();
  getAgentContentStoreMock.mockResolvedValue({ uploadImage: vi.fn() });
  const res = await POST(req({ title: "T", filename: "cover.png" }));
  expect(res.status).toBe(400);
});

test("rejects invalid base64 payload", async () => {
  withAuth();
  getAgentContentStoreMock.mockResolvedValue({ uploadImage: vi.fn() });
  const res = await POST(req({ title: "T", filename: "cover.png", data: "!!notbase64!!" }));
  expect(res.status).toBe(400);
});

test("rejects oversized image (>10MB)", async () => {
  withAuth();
  getAgentContentStoreMock.mockResolvedValue({ uploadImage: vi.fn() });
  const big = "A".repeat(15 * 1024 * 1024);
  const res = await POST(req({ title: "T", filename: "c.png", data: big }));
  expect(res.status).toBe(413);
});

test("returns 500 when store.uploadImage throws", async () => {
  withAuth();
  getAgentContentStoreMock.mockResolvedValue({
    uploadImage: vi.fn().mockRejectedValue(new Error("boom")),
  });
  const res = await POST(req({ title: "T", filename: "c.png", data: PNG }));
  expect(res.status).toBe(500);
});

test("decodes a data: URL, uploads as slug + safe filename, returns path", async () => {
  withAuth();
  const uploadImage = vi.fn().mockResolvedValue("/api/images/abc");
  getAgentContentStoreMock.mockResolvedValue({ uploadImage });
  const res = await POST(
    req({ title: "My Cover Post", filename: "Cover Page.png", data: `data:image/png;base64,${PNG}` }),
  );
  const json = (await res.json()) as { ok: boolean; path: string };
  expect(res.status).toBe(201);
  expect(json.ok).toBe(true);
  expect(json.path).toBe("/api/images/abc");
  expect(uploadImage).toHaveBeenCalledWith("agent-test", "my-cover-post", "cover-page.png", expect.any(Uint8Array));
  const bytes = uploadImage.mock.calls[0][3] as Uint8Array;
  expect(bytes.byteLength).toBeGreaterThan(0);
});

test("accepts raw base64 (no data: URL prefix)", async () => {
  withAuth();
  const uploadImage = vi.fn().mockResolvedValue("/api/images/xyz");
  getAgentContentStoreMock.mockResolvedValue({ uploadImage });
  const res = await POST(req({ title: "T", filename: "c.png", data: PNG }));
  expect(res.status).toBe(201);
});