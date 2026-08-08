"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCommentAction } from "@/app/community/actions";
import { AuthorName } from "@/components/author-name";
import { Check } from "@phosphor-icons/react";

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
            setPosted(true);
            if (postedTimer.current) clearTimeout(postedTimer.current);
            postedTimer.current = setTimeout(() => setPosted(false), 2200);
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
          disabled={isPending || posted || body.trim().length === 0}
          className={
            posted
              ? "btn-primary border-seal/50 bg-seal/10 text-seal"
              : "btn-primary"
          }
        >
          {isPending ? (
            "Posting…"
          ) : posted ? (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ animation: "fade-in 0.22s var(--ease-out)" }}
            >
              <Check size={14} weight="bold" aria-hidden />
              Posted
            </span>
          ) : parentId ? (
            "Post reply"
          ) : (
            "Comment"
          )}
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
