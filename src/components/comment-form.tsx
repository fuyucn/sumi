"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCommentAction } from "@/app/community/actions";
import { AuthorName } from "@/components/author-name";

export function CommentForm({
  postHandle,
  slug,
  authorHandle,
  parentId,
  onDone,
}: {
  postHandle: string;
  slug: string;
  authorHandle: string;
  parentId?: string;
  onDone?: () => void;
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
          const result = await addCommentAction({
            postHandle,
            slug,
            body,
            ...(parentId ? { parentId } : {}),
          });
          if (result.ok) {
            setBody("");
            onDone?.();
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
      className={`${parentId ? "" : "mt-6"} min-w-0`}
    >
      <label className="block text-sm text-ink-muted" htmlFor={`comment-${postHandle}-${slug}${parentId ? "-" + parentId : ""}`}>
        Reply as <AuthorName handle={authorHandle} />
      </label>
      <textarea
        id={`comment-${postHandle}-${slug}${parentId ? "-" + parentId : ""}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a comment…"
        className="field mt-2"
      />
      {error ? <p className="mt-2 text-sm text-seal">{error}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || body.trim().length === 0}
          className="btn-primary"
        >
          {isPending ? "Posting…" : "Comment"}
        </button>
        {parentId ? (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-ink-faint transition-colors hover:text-ink-muted"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
