"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCommentAction } from "@/app/community/actions";

export function CommentForm({
  postHandle,
  slug,
  authorHandle,
}: {
  postHandle: string;
  slug: string;
  authorHandle: string;
}) {
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
          const result = await addCommentAction({ postHandle, slug, body });
          if (result.ok) {
            setBody("");
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
      className="mt-6"
    >
      <label className="block text-sm text-ink-muted" htmlFor={`comment-${postHandle}-${slug}`}>
        Reply as @{authorHandle}
      </label>
      <textarea
        id={`comment-${postHandle}-${slug}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a comment…"
        className="mt-2 w-full rounded border border-line-strong bg-paper px-3 py-2 text-ink focus:outline-none"
      />
      {error ? <p className="mt-2 text-sm text-seal">{error}</p> : null}
      <div className="mt-3">
        <button
          type="submit"
          disabled={isPending || body.trim().length === 0}
          className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
