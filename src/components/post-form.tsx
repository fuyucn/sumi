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
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="font-serif text-3xl font-semibold placeholder:text-stone-300 focus:outline-none w-full bg-transparent"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags, comma separated"
        className="text-sm text-stone-500 placeholder:text-stone-300 focus:outline-none w-full bg-transparent border-b border-stone-200 pb-2"
      />
      <Editor initialMarkdown={initial?.body ?? ""} onChange={setBody} />
      <div className="flex justify-end gap-3 pt-2">
        <button
          disabled={busy}
          onClick={() => submit(false)}
          className="border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
        >
          Save draft
        </button>
        <button
          disabled={busy}
          onClick={() => submit(true)}
          className="bg-stone-900 text-white hover:bg-stone-700 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
        >
          Publish
        </button>
      </div>
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
    </div>
  );
}
