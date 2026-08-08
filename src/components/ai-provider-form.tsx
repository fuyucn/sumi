"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAiProviderAction, testAiProviderAction } from "@/app/settings/actions";
import { Check } from "@phosphor-icons/react";

export interface AiProviderInitial {
  baseUrl: string;
  model: string;
  enabled: boolean;
  hasKey: boolean;
}

const PRESETS = [
  { label: "OpenCode Zen（推荐）", baseUrl: "https://opencode.ai/zen/go/v1", model: "glm-5.1" },
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { label: "Moonshot Kimi", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  { label: "SiliconFlow", baseUrl: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct" },
  { label: "Ollama 本地", baseUrl: "http://localhost:11434/v1", model: "qwen2.5" },
] as const;

const MODEL_SUGGESTIONS = [
  "glm-5.1",
  "glm-5",
  "kimi-k2.7-code",
  "deepseek-v4-flash",
  "qwen3.5-plus",
  "minimax-m2.5",
  "gpt-4o-mini",
  "deepseek-chat",
  "qwen2.5",
] as const;

export function AiProviderForm({ initial }: { initial: AiProviderInitial }) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || "https://opencode.ai/zen/go/v1");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model || "glm-5.1");
  const [enabled, setEnabled] = useState(initial.enabled);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  };

  const payload = () => ({ baseUrl, apiKey, model });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setTestResult(null);
        startTransition(async () => {
          const result = await saveAiProviderAction({ ...payload(), enabled });
          if (result.ok) {
            flashSaved();
            setApiKey("");
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
      className="max-w-md space-y-3"
    >
      <div>
        <label htmlFor="ai-preset" className="text-sm font-medium text-ink-muted">
          服务商预设
        </label>
        <select
          id="ai-preset"
          defaultValue=""
          onChange={(e) => {
            const preset = PRESETS.find((p) => p.label === e.target.value);
            if (preset) {
              setBaseUrl(preset.baseUrl);
              setModel(preset.model);
            }
          }}
          className="field mt-1"
        >
          <option value="">自定义（手动填写）</option>
          {PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ai-base-url" className="text-sm font-medium text-ink-muted">
          Base URL
        </label>
        <input
          id="ai-base-url"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://opencode.ai/zen/go/v1"
          className="field mt-1"
        />
      </div>
      <div>
        <label htmlFor="ai-api-key" className="text-sm font-medium text-ink-muted">
          API Key
        </label>
        <input
          id="ai-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initial.hasKey ? "••••••••（留空保持不变）" : "sk-..."}
          className="field mt-1"
        />
      </div>
      <div>
        <label htmlFor="ai-model" className="text-sm font-medium text-ink-muted">
          Model
        </label>
        <input
          id="ai-model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="glm-5.1"
          list="ai-model-suggestions"
          className="field mt-1"
        />
        <datalist id="ai-model-suggestions">
          {MODEL_SUGGESTIONS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <label className="flex items-center gap-3 pt-1 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-seal"
        />
        启用 AI 总结（在编辑页手动一键生成）
      </label>

      {error ? <p className="text-sm text-seal">{error}</p> : null}
      {testResult ? (
        <p className={`text-sm ${testResult.startsWith("✓") ? "text-ink-muted" : "text-seal"}`}>{testResult}</p>
      ) : null}
      {saved ? (
        <p
          className="inline-flex items-center gap-1.5 rounded-full border border-seal/50 bg-seal/10 px-2.5 py-0.5 text-sm text-seal"
          style={{ animation: "fade-in 0.22s var(--ease-out)" }}
        >
          <Check size={14} weight="bold" aria-hidden />
          已保存
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setTestResult(null);
            startTransition(async () => {
              const result = await testAiProviderAction(payload());
              setTestResult(result.ok ? "✓ 连接成功" : `✗ ${result.error}`);
            });
          }}
          className="btn-ghost text-xs"
        >
          测试连接
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  );
}
