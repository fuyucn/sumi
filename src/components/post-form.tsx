"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Editor } from "./editor";
import { savePostAction } from "@/app/write/actions";

export function PostForm({ initial }: { initial?: { title: string; tags: string; body: string; publishedAt?: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);
    const res = await savePostAction({ title, tags, body, publish, publishedAt: initial?.publishedAt });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(publish ? "/" : `/write/${res.slug}`);
  }

  return (
    <div className="flex flex-col">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full bg-transparent font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-ink placeholder:text-ink-faint/60 focus:outline-none"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Add tags, comma separated"
        className="mt-3 w-full bg-transparent text-sm text-ink-muted placeholder:text-ink-faint/70 focus:outline-none"
      />
      <Editor initialMarkdown={initial?.body ?? ""} onChange={setBody} />
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-5">
        {error ? (
          <p className="mr-auto text-sm text-seal">{error}</p>
        ) : (
          <p className="mr-auto text-xs text-ink-faint">Saved to your GitHub repo on publish.</p>
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
