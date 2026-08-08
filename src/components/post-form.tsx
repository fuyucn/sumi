"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Editor } from "./editor";
import { TagPicker } from "./tag-picker";
import { AiSummaryEditor } from "./ai-summary-editor";
import { EditorBackLink } from "./editor-back-link";
import { useDraftAutosave, type DraftData } from "./use-autosave";
import { savePostAction, uploadImageAction } from "@/app/write/actions";
import { saveAgentPostAction } from "@/app/write/agent-actions";
import type { AiTask } from "@/content/ai-store";
import type { HeadingInfo } from "@/lib/heading-slug";

export function PostForm({
  initial,
  draftKey = "new",
  postSlug,
  agentSource,
  initialAgent,
  initialAiTask,
  aiHeadings,
}: {
  initial?: { title: string; tags: string; body: string; excerpt?: string; publishedAt?: string };
  /** Preserve the Agent-authored marker on the post across saves. */
  initialAgent?: boolean;
  draftKey?: string;
  /** Set when editing an existing post (the AI 总结 panel needs a slug). */
  postSlug?: string;
  /** When set, the editor opened an agent post; saving stays under the agent handle. */
  agentSource?: string;
  initialAiTask?: AiTask | null;
  aiHeadings?: HeadingInfo[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tags, setTags] = useState<string[]>(
    initial?.tags
      ? initial.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
  );
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [initialBody, setInitialBody] = useState(initial?.body ?? "");
  const [editorKey, setEditorKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null);

  const { savedAt, clear } = useDraftAutosave({
    key: draftKey,
    state: { title, tags, body, excerpt, savedAt: "" },
    dirty,
    onRecover: useCallback((d: DraftData) => {
      setTitle(d.title);
      setTags(d.tags);
      setExcerpt(d.excerpt ?? "");
      setBody(d.body);
      setInitialBody(d.body);
      setEditorKey((k) => k + 1);
      setRecoveredAt(d.savedAt);
    }, []),
  });

  function handleTitle(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setDirty(true);
  }
  function handleTags(t: string[]) {
    setTags(t);
    setDirty(true);
  }
  function handleBody(md: string) {
    setBody(md);
    setDirty(true);
  }
  function handleExcerpt(v: string) {
    setExcerpt(v);
    setDirty(true);
  }

  async function handleUploadImage(file: File): Promise<string | null> {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const res = await uploadImageAction({ title, filename: file.name, base64 });
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    return res.path;
  }

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);
    const form = {
      title,
      tags: tags.join(", "),
      body,
      excerpt,
      publish,
      publishedAt: initial?.publishedAt,
      agent: agentSource ? true : initialAgent,
    };
    const res = agentSource && postSlug
      ? await saveAgentPostAction(agentSource, postSlug, form)
      : await savePostAction(form);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clear();
    setDirty(false);
    if (agentSource) {
      router.push(publish ? "/" : `/write/${res.slug}?agent=${encodeURIComponent(agentSource)}`);
    } else {
      router.push(publish ? "/" : `/write/${res.slug}`);
    }
  }

  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col">
      <EditorBackLink href="/write" label="Your posts" />
      {agentSource ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded border border-seal/30 bg-seal/[0.06] px-4 py-2.5 text-sm text-ink">
          <span>
            正在编辑 agent 的文章（@{agentSource}），保存后仍保留在 agent 名下、
            作者不变，AI 总结可随时生成。
          </span>
        </div>
      ) : null}
      {recoveredAt ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded border border-seal/20 bg-seal/[0.06] px-4 py-2.5 text-sm text-ink">
          <span>
            Restored your local autosave from{" "}
            {new Date(recoveredAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            . You can keep writing from where you left off.
          </span>
          <button
            type="button"
            onClick={() => setRecoveredAt(null)}
            className="shrink-0 font-medium text-seal transition-colors hover:text-seal-soft"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <input
        value={title}
        onChange={handleTitle}
        placeholder="Title"
        className="w-full bg-transparent font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-ink placeholder:text-ink-faint/60 focus:outline-none"
      />
      <TagPicker value={tags} onChange={handleTags} />
      <div className="mt-4">
        <input
          value={excerpt}
          onChange={(e) => handleExcerpt(e.target.value)}
          maxLength={300}
          placeholder="导读（可选）：一句话摘要，显示在列表卡片与搜索描述中；留空时 AI 总结的 TL;DR 会自动回填"
          className="w-full border-b border-line bg-transparent py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint/50 focus:border-seal focus:outline-none transition-colors duration-[var(--dur-short)]"
        />
        {excerpt ? (
          <p className="mt-1.5 text-xs text-ink-faint">
            手动导读优先，AI 总结不会再覆盖它
          </p>
        ) : null}
      </div>
      <Editor key={editorKey} initialMarkdown={initialBody} onChange={handleBody} uploadImage={handleUploadImage} />

      {postSlug ? (
        <AiSummaryEditor
          slug={postSlug}
          body={body}
          sourceHandle={agentSource}
          initialTask={initialAiTask}
          headings={aiHeadings}
        />
      ) : null}

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-5">
        {error ? (
          <p className="mr-auto text-sm text-seal">{error}</p>
        ) : (
          <p className="mr-auto text-xs text-ink-faint">
            {savedTime ? (
              <>
                <span aria-hidden className="save-dot mr-1.5 text-seal">●</span>
                Autosaved locally at {savedTime}
              </>
            ) : (
              "Everything is autosaved to your browser as you type."
            )}
          </p>
        )}
        <button
          disabled={busy}
          onClick={() => submit(false)}
          className="btn-ghost px-4"
        >
          Save draft
        </button>
        <button
          disabled={busy}
          onClick={() => submit(true)}
          className="btn-primary px-5"
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}
