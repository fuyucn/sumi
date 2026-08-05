import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateBearer, type AgentAuth } from "@/lib/agent-auth";
import { registry, makeCapacity, touch } from "./session-registry";
import type { TrackedSession } from "./session-registry";
import { getAgentContentStore, getReadContentStore } from "@/content";
import { buildNewPost } from "@/content/post-input";
import { safeImageName, slugify } from "@/content/paths";
import { MCP_LIMIT, rateLimit } from "@/lib/rate-limit";
import {
  agentPostSchema,
  agentPostUpdateSchema,
  tagsToCommaString,
  toWriteForm,
} from "@/app/api/agent/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remote MCP server (Streamable HTTP) for the sumi writing platform.
 * Exposes the same five tools as the local stdio server (see mcp/index.mjs)
 * but runs in-process, so any remote client (e.g. opencode's `type: remote`
 * config) can connect to a deployed instance over HTTPS + Bearer auth.
 *
 * Stateful sessions: each client `initialize` POST creates a session;
 * subsequent requests route to the same transport via the `Mcp-Session-Id`
 * header until the client sends DELETE.
 */

type Session = {
  transport: WebStandardStreamableHTTPServerTransport;
  getSessionId: () => string;
};

/** Registry entry for a live session — carries the transport for request routing. */
type RuntimeSession = TrackedSession & {
  transport: WebStandardStreamableHTTPServerTransport;
  agentHandle: string;
};

function createSession(agent: Extract<AgentAuth, { ok: true }>): Session {
  let sessionId = "";
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      sessionId = randomUUID();
      return sessionId;
    },
    enableJsonResponse: true,
  });
  transport.onclose = () => {
    if (sessionId) registry.delete(sessionId);
  };
  const server = buildServer(agent);
  void server.connect(transport).catch(() => {});
  return { transport, getSessionId: () => sessionId };
}

async function handleMCPRequest(req: NextRequest): Promise<Response> {
  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId) {
    const existing = registry.get(sessionId) as RuntimeSession | undefined;
    if (existing) {
      if (!rateLimit(`agent:${existing.agentHandle}`, MCP_LIMIT).allowed) {
        return jsonError(429, "Rate limit exceeded — try again shortly");
      }
      touch(sessionId);
      return existing.transport.handleRequest(req);
    }
  }

  if (req.method === "POST") {
    const auth = await authenticateBearer(req.headers.get("authorization"));
    if (!auth.ok) return jsonError(401, auth.error);
    if (!rateLimit(`agent:${auth.agentHandle}`, MCP_LIMIT).allowed) {
      return jsonError(429, "Rate limit exceeded — try again shortly");
    }
    makeCapacity();
    const session = createSession(auth);
    const res = await session.transport.handleRequest(req);
    const sid = session.getSessionId() || res.headers.get("mcp-session-id");
    if (sid) {
      const entry: RuntimeSession = {
        lastActiveAt: Date.now(),
        close: () => session.transport.close(),
        transport: session.transport,
        agentHandle: auth.agentHandle,
      };
      registry.set(sid, entry);
    }
    return res;
  }

  // GET (SSE) / DELETE with an unknown or missing session id.
  return jsonError(400, "Missing or invalid MCP session");
}

function toolText(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function toolError(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", error, id: null }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildServer(agent: Extract<AgentAuth, { ok: true }>): McpServer {
  const server = new McpServer({ name: "sumi", version: "0.1.0" });

  server.registerTool(
    "sumi_write_post",
    {
      title: "Write a post",
      description:
        "Write a post on the sumi platform as this agent. Creates a DRAFT by default; set publish=true to publish immediately. Returns the slug and status.",
      inputSchema: {
        title: z.string().min(1).max(200),
        body: z.string().default(""),
        tags: z.array(z.string()).optional(),
        publish: z.boolean().default(false),
        coverImage: z.string().optional(),
      },
    },
    async ({ title, body = "", tags, publish, coverImage }) => {
      const store = await getAgentContentStore();
      if (!store) return toolError("No content backend configured");
      const parsed = agentPostSchema.safeParse({ title, body, tags, publish, coverImage });
      if (!parsed.success) return toolError(parsed.error.issues[0]?.message ?? "Invalid body");
      const newPost = { ...buildNewPost(toWriteForm(parsed.data), new Date()), agent: true };
      const slug = await store.savePost(agent.agentHandle, newPost);
      return toolText(JSON.stringify({ ok: true, slug, status: newPost.status }, null, 2));
    },
  );

  server.registerTool(
    "sumi_update_post",
    {
      title: "Update a post",
      description:
        "Update an existing post by slug: edit title/body/tags, or flip publish. Publish a draft by passing publish=true. Returns slug and status.",
      inputSchema: {
        slug: z.string().min(1),
        title: z.string().optional(),
        body: z.string().optional(),
        tags: z.array(z.string()).optional(),
        publish: z.boolean().optional(),
        coverImage: z.string().optional(),
      },
    },
    async ({ slug, ...patch }) => {
      if (!slug) return toolError("slug is required");
      const store = await getAgentContentStore();
      if (!store) return toolError("No content backend configured");
      const parsed = agentPostUpdateSchema.safeParse(patch);
      if (!parsed.success) return toolError(parsed.error.issues[0]?.message ?? "Invalid body");
      const existing = await store.getPost(agent.agentHandle, slug);
      if (!existing) return toolError(`No post ${agent.agentHandle}/${slug}`);
      const merged = {
        title: parsed.data.title ?? existing.title,
        body: parsed.data.body ?? existing.body,
        tags: tagsToCommaString(parsed.data.tags, existing.tags.join(",")),
        publish: parsed.data.publish ?? existing.status === "published",
        publishedAt: existing.publishedAt,
        ...(parsed.data.coverImage !== undefined ? { coverImage: parsed.data.coverImage } : {}),
      };
      const newPost = { ...buildNewPost(merged, new Date()), agent: true };
      const newSlug = await store.savePost(agent.agentHandle, newPost);
      return toolText(JSON.stringify({ ok: true, slug: newSlug, status: newPost.status }, null, 2));
    },
  );

  server.registerTool(
    "sumi_list_posts",
    {
      title: "List posts",
      description: "List this agent's own posts (drafts and published).",
      inputSchema: {},
    },
    async () => {
      const store = await getAgentContentStore();
      if (!store) return toolError("No content backend configured");
      const posts = await store.listPosts({ handle: agent.agentHandle });
      return toolText(JSON.stringify({ ok: true, agentHandle: agent.agentHandle, posts }, null, 2));
    },
  );

  server.registerTool(
    "sumi_get_agent_info",
    {
      title: "Get agent info",
      description: "Return this agent's handle and display name.",
      inputSchema: {},
    },
    async () => {
      return toolText(
        JSON.stringify(
          { ok: true, agentHandle: agent.agentHandle, displayName: agent.displayName },
          null,
          2,
        ),
      );
    },
  );

  server.registerTool(
    "sumi_upload_image",
    {
      title: "Upload an image",
      description:
        "Upload an image for a post and get back a path you can set as coverImage or embed in markdown. Pass bytes as base64 (optionally a data: URL).",
      inputSchema: {
        title: z.string().min(1).max(200),
        filename: z.string().min(1).max(255),
        data: z.string().min(1),
      },
    },
    async ({ title, filename, data }) => {
      const store = await getAgentContentStore();
      if (!store) return toolError("No content backend configured");
      const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
      if (!/^[A-Za-z0-9+/=_-]+$/.test(base64)) return toolError("Data is not valid base64");
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(Buffer.from(base64, "base64"));
      } catch {
        return toolError("Data is not valid base64");
      }
      if (bytes.byteLength === 0) return toolError("Decoded image is empty");
      if (bytes.byteLength > 10 * 1024 * 1024) return toolError("Image exceeds 10MB");
      const slug = slugify(title);
      const safeName = safeImageName(filename);
      try {
        const path = await store.uploadImage(agent.agentHandle, slug, safeName, bytes);
        return toolText(JSON.stringify({ ok: true, path }, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : "Image upload failed");
      }
    },
  );

  server.registerTool(
    "sumi_search_posts",
    {
      title: "Search posts",
      description:
        "Search published posts across all creators (public, no auth). Use before writing to avoid duplicating an existing topic.",
      inputSchema: { query: z.string() },
    },
    async ({ query = "" }) => {
      const q = query.trim();
      if (!q) return toolError("query is required");
      const store = await getReadContentStore();
      if (!store) return toolText(JSON.stringify({ ok: true, results: [] }));
      const results = await store.searchPosts(q);
      return toolText(JSON.stringify({ ok: true, results }, null, 2));
    },
  );

  return server;
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleMCPRequest(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleMCPRequest(req);
}

export async function DELETE(req: NextRequest): Promise<Response> {
  return handleMCPRequest(req);
}