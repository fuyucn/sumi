"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNoteAction } from "@/app/community/actions";

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
      className="rounded border border-line-strong bg-paper p-4 shadow-sm"
    >
      <label htmlFor="note-body" className="block text-sm text-ink-muted">
        Write as @{handle}
      </label>
      <textarea
        id="note-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="A fleeting thought… (Markdown ok)"
        className="mt-2 w-full resize-y rounded border border-line-strong bg-paper px-3 py-2 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-seal"
      />
      {error ? <p className="mt-2 text-sm text-seal">{error}</p> : null}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-ink-faint tabular-nums">{body.length}/2000</span>
        <button
          type="submit"
          disabled={isPending || body.trim().length === 0}
          className="press rounded-full bg-ink px-4 py-1.5 font-medium text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Pinning…" : "Post note"}
        </button>
      </div>
    </form>
  );
}
