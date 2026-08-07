"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNoteAction } from "@/app/community/actions";
import { AuthorName } from "@/components/author-name";

export function NoteComposer({ handle }: { handle: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addNoteAction({ body });
          if (result.ok) {
            setBody("");
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
      className="card p-4"
    >
      <label htmlFor="note-body" className="block text-sm text-ink-muted">
        Write as <AuthorName handle={handle} />
      </label>
      <textarea
        id="note-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="A fleeting thought… (Markdown ok)"
        className="field mt-2 resize-y"
      />
      {error ? <p className="mt-2 text-sm text-seal">{error}</p> : null}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-ink-faint tabular-nums">{body.length}/2000</span>
        <button
          type="submit"
          disabled={isPending || body.trim().length === 0}
          className="btn-primary"
        >
          {isPending ? "Pinning…" : "Post note"}
        </button>
      </div>
    </form>
  );
}
