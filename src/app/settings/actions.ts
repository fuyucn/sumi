"use server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getAiStore } from "@/content";
import { testProvider } from "@/lib/ai/summarize";
import type { AiProviderConfig } from "@/content/ai-store";

export type AiSettingsResult = { ok: true } | { ok: false; error: string };

const baseSchema = z.object({
  baseUrl: z.string().trim().url("请输入合法的 Base URL"),
  model: z.string().trim().min(1, "请输入模型名称"),
});

async function requireHandle(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getUserHandle(user.id);
}

/** Persist the author's AI provider config. Empty apiKey keeps the stored key. */
export async function saveAiProviderAction(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}): Promise<AiSettingsResult> {
  const handle = await requireHandle();
  if (!handle) return { ok: false, error: "请先登录" };
  const aiStore = await getAiStore();
  if (!aiStore) return { ok: false, error: "AI 后端未配置（需要 Postgres 存储）" };

  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "表单填写有误" };

  const existing = await aiStore.getProvider(handle);
  const apiKey = input.apiKey.trim() || existing?.apiKey || "";
  if (!apiKey) return { ok: false, error: "请填写 API Key" };

  const provider: AiProviderConfig = {
    handle,
    baseUrl: parsed.data.baseUrl,
    apiKey,
    model: parsed.data.model,
    enabled: input.enabled,
  };
  await aiStore.saveProvider(provider, new Date());
  return { ok: true };
}

/** Connectivity check against the provider (uses the stored key when blank). */
export async function testAiProviderAction(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<AiSettingsResult> {
  const handle = await requireHandle();
  if (!handle) return { ok: false, error: "请先登录" };
  const aiStore = await getAiStore();
  if (!aiStore) return { ok: false, error: "AI 后端未配置（需要 Postgres 存储）" };

  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "表单填写有误" };

  const existing = await aiStore.getProvider(handle);
  const apiKey = input.apiKey.trim() || existing?.apiKey || "";
  if (!apiKey) return { ok: false, error: "请填写 API Key" };

  const result = await testProvider({
    handle,
    baseUrl: parsed.data.baseUrl,
    apiKey,
    model: parsed.data.model,
    enabled: true,
  });
  if (result.ok) return { ok: true };
  return { ok: false, error: `连接失败：${result.error}` };
}
