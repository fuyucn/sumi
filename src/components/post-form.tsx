"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Editor } from "./editor";
import { TagPicker } from "./tag-picker";
import { useDraftAutosave, type DraftData } from "./use-autosave";
import { savePostAction, uploadImageAction } from "@/app/write/actions";

export function PostForm({
  initial,
  draftKey = "new",
}: {
  initial?: { title: string; tags: string; body: string; publishedAt?: string };
  draftKey?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tags, setTags] = useState<string[]>(
    initial?.tags
      ? initial.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
  );
  const [body, setBody] = useState(initial?.body ?? "");
  const [initialBody, setInitialBody] = useState(initial?.body ?? "");
  const [editorKey, setEditorKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null);

  const { savedAt, clear } = useDraftAutosave({
    key: draftKey,
    state: { title, tags, body, savedAt: "" },
    dirty,
    onRecover: useCallback((d: DraftData) => {
      setTitle(d.title);
      setTags(d.tags);
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
    const res = await savePostAction({ title, tags: tags.join(", "), body, publish, publishedAt: initial?.publishedAt });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clear();
    setDirty(false);
    router.push(publish ? "/" : `/write/${res.slug}`);
  }

  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col">
      {recoveredAt ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded border border-seal/20 bg-seal/[0.06] px-4 py-2.5 text-sm text-ink">
          <span>
            Restored your local autosave from{" "}
            {new Date(recoveredAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            — you can keep writing from where you left off.
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
      <Editor key={editorKey} initialMarkdown={initialBody} onChange={handleBody} uploadImage={handleUploadImage} />

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-5">
        {error ? (
          <p className="mr-auto text-sm text-seal">{error}</p>
        ) : (
          <p className="mr-auto text-xs text-ink-faint">
            {savedTime ? (
              <>
                <span aria-hidden className="mr-1.5 text-seal">●</span>
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
          className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/[0.03] disabled:opacity-40"
        >
          Save draft
        </button>
        <button
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-40"
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}