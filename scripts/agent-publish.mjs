#!/usr/bin/env node
// Agent publishing runner — turn a prompt into a drafted post.
//
// Pipeline: prompt → LLM (chat completions) → strict-JSON {title, body, tags}
// → POST to the sumi agent API as a DRAFT (unless --publish).
//
// Config (env):
//   SUMI_API_KEY          (required) agent bearer key
//   SUMI_API_PRIVATE_KEY  (required) Ed25519 private JWK {"x":"...","d":"..."}
//   SUMI_BASE_URL         (optional) default http://localhost:3005
//   SUMI_LLM_BASE_URL     (optional) default https://api.openai.com/v1
//   SUMI_LLM_MODEL        (optional) default gpt-4o-mini
//   SUMI_LLM_API_KEY      (required) LLM provider key
//
// Usage:
//   node scripts/agent-publish.mjs "完成 Docker 部署后总结一下踩的坑"
//   node scripts/agent-publish.mjs --file=notes.md --publish
//   cat notes.md | node scripts/agent-publish.mjs --publish
//
// Works with any OpenAI-compatible endpoint (OpenAI, Groq, Ollama, local mock…).

import { readFileSync } from "node:fs";
import { signRequest } from "../mcp/lib/sign.mjs";
const BASE_URL = (process.env.SUMI_BASE_URL ?? "http://localhost:3005").replace(/\/$/, "");
const API_KEY = process.env.SUMI_API_KEY ?? "";
const PRIVATE_JWK = process.env.SUMI_API_PRIVATE_KEY ?? "";
const LLM_BASE_URL = (process.env.SUMI_LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const LLM_MODEL = process.env.SUMI_LLM_MODEL ?? "gpt-4o-mini";
const LLM_API_KEY = process.env.SUMI_LLM_API_KEY ?? "";

const args = process.argv.slice(2);
const flagIndex = args.findIndex((a) => a.startsWith("--"));
const positional = args.slice(0, flagIndex === -1 ? args.length : flagIndex).join(" ");
const flags = new Set(args.filter((a) => a.startsWith("--")));
const publish = flags.has("--publish");
const model = flagValue(args, "--model=") ?? LLM_MODEL;
const prompt = positional || readPromptFromFile(args) || process.env.SUMI_PROMPT || (await readStdinIfPiped());

if (!API_KEY) die("SUMI_API_KEY is required (agent bearer key from scripts/create-agent.ts)");
if (!PRIVATE_JWK) die("SUMI_API_PRIVATE_KEY is required (Ed25519 private JWK)");
if (!LLM_API_KEY) die("SUMI_LLM_API_KEY is required (LLM provider key)");
if (!prompt) die("No prompt given. Pass it as an argument, --file=path.md, SUMI_PROMPT, or stdin.");

log(`LLM: ${LLM_MODEL}  publish: ${publish}  → ${BASE_URL}`);

const draft = await generatePost(prompt, model);
log(`Generated: "${draft.title}" (${draft.tags.length} tags)`);

const result = await callApi("/api/agent/posts", {
  method: "POST",
  body: { title: draft.title, body: draft.body, tags: draft.tags, publish },
});
log(`${publish ? "Published" : "Drafted"}: ${result.slug} (${result.status})`);
if (!publish) log("Review it at: " + BASE_URL + "/write");

// ---- helpers ----

async function generatePost(promptText, mdl) {
  const system = `You are a technical writer for the sumi platform. Turn the user's input into ONE concise markdown post.
Structure the body with these sections (skip any that don't apply):
- 做了什么 (what was done / key decisions)
- 学了什么 (new knowledge, APIs, tooling)
- 踩了什么坑 (problems, root cause, fix) — most valuable, prioritize
- 总结 (1-3 takeaways)
Write body in Chinese. Use proper markdown, code fences with language tags.
Reply with STRICT JSON only, no markdown fences, no prose around it:
{"title":"<concrete declarative title, Chinese, <=60 chars>","body":"<full markdown body>","tags":["<1-3 tags>"]}`;

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({
      model: mdl,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: promptText },
      ],
    }),
  });
  if (!res.ok) die(`LLM request failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) die("LLM returned an empty response");
  return parseJson(text);
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    if (!obj.title || !obj.body) throw new Error("missing title/body");
    return { title: String(obj.title), body: String(obj.body), tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [] };
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        const obj = JSON.parse(cleaned.slice(start, end + 1));
        return { title: String(obj.title), body: String(obj.body), tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [] };
      } catch {
        /* fallthrough */
      }
    }
    die(`Could not parse LLM JSON output:\n${text.slice(0, 500)}`);
  }
}

async function callApi(path, { method, body }) {
  const bodyText = body !== undefined ? JSON.stringify(body) : "";
  const { signature, iat } = signRequest(PRIVATE_JWK, { method, pathname: path, body: bodyText });
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "X-Agent-Signature": signature,
      "X-Agent-Timestamp": String(iat),
      "Content-Type": "application/json",
    },
    body: bodyText,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) die(`API error ${res.status}: ${data?.error ?? "unknown"}`);
  return data;
}

function readPromptFromFile(argList) {
  const f = flagValue(argList, "--file=");
  if (!f) return null;
  return readFileSync(f, "utf8");
}

function flagValue(argList, prefix) {
  return argList.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function readStdinIfPiped() {
  if (!process.stdin.isTTY) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data.trim();
  }
  return null;
}

function log(msg) {
  console.error(`[agent-publish] ${msg}`);
}

function die(msg) {
  console.error(`[agent-publish] error: ${msg}`);
  process.exit(1);
}
