"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveProjectAction, deleteProjectAction } from "@/app/community/actions";
import { TagPicker } from "./tag-picker";

export function ProjectForm({
  initial,
}: {
  initial?: {
    slug?: string;
    title?: string;
    description?: string;
    url?: string;
    repo?: string;
    tech?: string[];
    coverImage?: string;
    gallery?: string[];
    featured?: boolean;
    order?: number;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [repo, setRepo] = useState(initial?.repo ?? "");
  const [tech, setTech] = useState<string[]>(initial?.tech ?? []);
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [gallery, setGallery] = useState<string[]>(initial?.gallery ?? []);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [order, setOrder] = useState(String(initial?.order ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveProjectAction({
      title,
      description,
      url,
      repo,
      tech,
      coverImage,
      gallery: gallery.filter((u) => u.trim() !== ""),
      featured,
      order: order === "" ? 0 : Number(order),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/write/projects");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial?.slug) return;
    if (!window.confirm("Delete this project?")) return;
    setBusy(true);
    setError(null);
    const res = await deleteProjectAction(initial.slug);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push("/write/projects");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <label className="block">
        <span className="text-sm text-ink-muted">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className="field mt-2"
        />
      </label>
      <label className="mt-6 block">
        <span className="text-sm text-ink-muted">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One or two sentences about the project"
          rows={3}
          className="field mt-2 resize-y"
        />
      </label>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-ink-muted">URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="field mt-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">Repo</span>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo or full URL"
            className="field mt-2"
          />
        </label>
      </div>
      <div className="mt-6 block">
        <span className="text-sm text-ink-muted">Tech stack</span>
        <TagPicker value={tech} onChange={setTech} />
      </div>
      <label className="mt-6 block">
        <span className="text-sm text-ink-muted">Cover image URL</span>
        <input
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://… (optional)"
          className="field mt-2"
        />
      </label>
      <div className="mt-6 block">
        <span className="text-sm text-ink-muted">Gallery images</span>
        <div className="mt-2 space-y-2">
          {gallery.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={url}
                onChange={(e) => {
                  const next = [...gallery];
                  next[i] = e.target.value;
                  setGallery(next);
                }}
                placeholder="https://… (optional)"
                className="field"
              />
              <button
                type="button"
                aria-label={`Remove gallery image ${i + 1}`}
                onClick={() => setGallery(gallery.filter((_, j) => j !== i))}
                className="btn-ghost shrink-0 px-2.5 text-sm text-ink-muted hover:text-seal"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setGallery([...gallery, ""])}
          className="btn-ghost mt-2 px-3 py-1 text-sm text-ink-muted hover:text-ink"
        >
          + Add image
        </button>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="accent-seal"
          />
          Featured
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">Sort order</span>
          <input
            type="number"
            min={0}
            max={999}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="0"
            className="field mt-2"
          />
        </label>
      </div>
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
