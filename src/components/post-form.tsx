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
    <div style={{ display: "grid", gap: 12 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ fontSize: "1.4rem", padding: 8 }} />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma, separated" style={{ padding: 8 }} />
      <Editor initialMarkdown={initial?.body ?? ""} onChange={setBody} />
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} onClick={() => submit(false)}>Save draft</button>
        <button disabled={busy} onClick={() => submit(true)}>Publish</button>
      </div>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </div>
  );
}
