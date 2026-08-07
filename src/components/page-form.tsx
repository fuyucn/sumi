"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { savePageAction, deletePageAction } from "@/app/community/actions";
import { Editor } from "./editor";

export function PageForm({
  initial,
}: {
  initial?: {
    slug?: string;
    title?: string;
    description?: string;
    body?: string;
    showInNav?: boolean;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [showInNav, setShowInNav] = useState(initial?.showInNav ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await savePageAction({
      title,
      description,
      body,
      showInNav,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/write/pages");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial?.slug) return;
    if (!window.confirm("Delete this page?")) return;
    setBusy(true);
    setError(null);
    const res = await deletePageAction(initial.slug);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push("/write/pages");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <label className="block">
        <span className="text-sm text-ink-muted">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
          className="field mt-2"
        />
      </label>
      <label className="mt-6 block">
        <span className="text-sm text-ink-muted">Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          className="field mt-2"
        />
      </label>
      <div className="mt-6">
        <span className="text-sm text-ink-muted">Content</span>
        <Editor initialMarkdown={body} onChange={setBody} />
      </div>
      <label className="mt-6 flex items-center gap-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={showInNav}
          onChange={(e) => setShowInNav(e.target.checked)}
          className="accent-seal"
        />
        Show a link to this page on my creator homepage
      </label>
      <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
        {error ? <p className="mr-auto text-sm text-seal">{error}</p> : null}
        {initial?.slug ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="btn-ghost text-ink-muted hover:text-seal"
          >
            Delete
          </button>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary ml-auto"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
