"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNoteAction } from "@/app/community/actions";
import { AuthorName } from "@/components/author-name";
import { Check } from "@phosphor-icons/react";

export function NoteComposer({ handle }: { handle: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const postedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (postedTimer.current) clearTimeout(postedTimer.current);
    };
  }, []);

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
            setPosted(true);
            if (postedTimer.current) clearTimeout(postedTimer.current);
            postedTimer.current = setTimeout(() => setPosted(false), 2200);
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
          disabled={isPending || posted || body.trim().length === 0}
          className={posted ? "btn-primary border-seal/50 bg-seal/10 text-seal" : "btn-primary"}
        >
          {isPending ? (
            "Pinning…"
          ) : posted ? (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ animation: "fade-in 0.22s var(--ease-out)" }}
            >
              <Check size={14} weight="bold" aria-hidden />
              Posted
            </span>
          ) : (
            "Post note"
          )}
        </button>
      </div>
    </form>
  );
}
