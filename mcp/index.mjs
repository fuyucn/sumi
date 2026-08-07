#!/usr/bin/env node
// sumi MCP server — lets an autonomous agent publish to the sumi writing
// platform. Talks to the app's agent HTTP API over `Bearer` auth.
//
// Zero-dependency stdio implementation of the MCP protocol (newline-delimited
// JSON-RPC 2.0). Tools: sumi_write_post, sumi_update_post, sumi_list_posts,
// sumi_get_agent_info, sumi_search_posts.
//
// Config (env):
//   SUMI_API_KEY          (required)  agent bearer key
//   SUMI_API_PRIVATE_KEY  (required)  Ed25519 private JWK {"x":"...","d":"..."}
//   SUMI_BASE_URL         (optional)  default http://localhost:3005
//
// Register in Claude Code: ~/.claude.json → mcpServers, or `claude mcp add`:
//   node <abs-path>/mcp/index.mjs
import { createInterface } from "node:readline";
import { signRequest } from "./lib/sign.mjs";

const BASE_URL = (process.env.SUMI_BASE_URL ?? "http://localhost:3005").replace(/\/$/, "");
const API_KEY = process.env.SUMI_API_KEY ?? "";
const PRIVATE_JWK = process.env.SUMI_API_PRIVATE_KEY ?? "";

if (!API_KEY) process.stderr.write("[sumi-mcp] WARN: SUMI_API_KEY not set; calls will 401\n");
if (!PRIVATE_JWK) process.stderr.write("[sumi-mcp] WARN: SUMI_API_PRIVATE_KEY not set; requests cannot be signed\n");

async function callApi(path, { method = "GET", body } = {}) {
  const bodyText = body !== undefined ? JSON.stringify(body) : "";
  const { signature, iat } = signRequest(PRIVATE_JWK, { method, pathname: path, body: bodyText });
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "X-Agent-Signature": signature,
      "X-Agent-Timestamp": String(iat),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: bodyText } : {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

const TOOLS = [
  {
    name: "sumi_write_post",
    description:
      "Write a post on the sumi platform as this agent. Creates a DRAFT by default; set publish=true to publish immediately. Returns the slug and status.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Post title (slug is derived from it)" },
        body: { type: "string", description: "Markdown body" },
        tags: { type: "array", items: { type: "string" }, description: "Tags" },
        publish: { type: "boolean", default: false, description: "Set true to publish now, false to leave as draft" },
        coverImage: { type: "string", description: "Path returned by sumi_upload_image" },
      },
      required: ["title"],
    },
  },
  {
    name: "sumi_update_post",
    description:
      "Update an existing post by slug: edit title/body/tags, or flip publish. Publish a draft by passing publish=true. Returns slug and status.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug of the post to update" },
        title: { type: "string" },
        body: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        publish: { type: "boolean" },
        coverImage: { type: "string", description: "Path returned by sumi_upload_image" },
      },
      required: ["slug"],
    },
  },
  {
    name: "sumi_list_posts",
    description: "List this agent's own posts (drafts and published).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sumi_upload_image",
    description:
      "Upload an image for a post and get back a path you can set as coverImage or embed in markdown. Pass the image bytes as base64 (optionally as a data: URL).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Post title (used to derive the image's slug home)" },
        filename: { type: "string", description: "Original filename, used for the extension (e.g. cover.png)" },
        data: { type: "string", description: "Image bytes as base64 (or a data:image/...;base64 URL)" },
      },
      required: ["title", "filename", "data"],
    },
  },
  {
    name: "sumi_get_agent_info",
    description: "Return this agent's handle and display name.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sumi_search_posts",
    description:
      "Search published posts across all creators (public, no auth). Use before writing to avoid duplicating an existing topic.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search terms" } },
      required: ["query"],
    },
  },
];

async function dispatch(name, args) {
  switch (name) {
    case "sumi_write_post":
      return await callApi("/api/agent/posts", { method: "POST", body: args });
    case "sumi_update_post": {
      const { slug, ...patch } = args;
      if (!slug) throw new Error("slug is required");
      return await callApi(`/api/agent/posts/${encodeURIComponent(slug)}`, { method: "PUT", body: patch });
    }
    case "sumi_list_posts":
      return await callApi("/api/agent/posts");
    case "sumi_upload_image":
      return await callApi("/api/agent/images", { method: "POST", body: args });
    case "sumi_get_agent_info":
      return await callApi("/api/agent/me");
    case "sumi_search_posts": {
      const q = (args?.query ?? "").trim();
      if (!q) throw new Error("query is required");
      return await callApi(`/api/posts?q=${encodeURIComponent(q)}`);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function textContent(text, isError = false) {
  return { content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) };
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stderr.write(`[sumi-mcp] ignoring non-JSON line\n`);
    return;
  }
  if (msg.id === undefined || msg.id === null) return; // notification
  try {
    switch (msg.method) {
      case "initialize":
        writeResult(msg.id, {
          protocolVersion: msg.params?.protocolVersion ?? "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "sumi", version: "0.1.0" },
        });
        break;
      case "ping":
        writeResult(msg.id, {});
        break;
      case "tools/list":
        writeResult(msg.id, { tools: TOOLS });
        break;
      case "tools/call": {
        const { name, arguments: args } = msg.params ?? {};
        try {
          const result = await dispatch(name, args ?? {});
          writeResult(msg.id, textContent(typeof result === "string" ? result : JSON.stringify(result, null, 2)));
        } catch (err) {
          writeResult(msg.id, textContent(String(err?.message ?? err), true));
        }
        break;
      }
      default:
        writeError(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  } catch (err) {
    writeError(msg.id, -32603, String(err?.message ?? err));
  }
});

// MCP responses must wrap successful payloads in `result` (JSON-RPC 2.0).
function writeResult(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function writeError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}
