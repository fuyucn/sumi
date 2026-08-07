"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveMagazineAction, deleteMagazineAction } from "@/app/community/actions";

export function MagazineForm({
  posts,
  initial,
}: {
  posts: { slug: string; title: string }[];
  initial?: { slug?: string; title?: string; description?: string; items?: string[] };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [checked, setChecked] = useState<Set<string>>(new Set(initial?.items ?? []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(slug: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveMagazineAction({
      title,
      description,
      items: [...checked],
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/write/magazines");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial?.slug) return;
    if (!window.confirm("Delete this magazine?")) return;
    setBusy(true);
    setError(null);
    const res = await deleteMagazineAction(initial.slug);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push("/write/magazines");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <label className="block">
        <span className="text-sm text-ink-muted">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Magazine title"
          className="field mt-2"
        />
      </label>
      <label className="mt-6 block">
        <span className="text-sm text-ink-muted">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
          className="field mt-2 resize-y"
        />
      </label>
      <fieldset className="mt-6">
        <legend className="text-sm text-ink-muted">Posts</legend>
        {posts.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No published posts yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line border-t border-line">
            {posts.map((post) => (
              <li key={post.slug} className="py-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked.has(post.slug)}
                    onChange={() => toggle(post.slug)}
                    className="accent-seal"
                  />
                  <span className="font-serif text-lg text-ink">{post.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
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
