"use client";
import { useState } from "react";
import { CommentForm } from "@/components/comment-form";

export function ReplyComposer({
  postHandle,
  slug,
  authorHandle,
  parentId,
}: {
  postHandle: string;
  slug: string;
  authorHandle: string;
  parentId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {open ? (
        <div className="mt-3 rounded border border-line bg-paper px-4 py-3">
          <CommentForm
            postHandle={postHandle}
            slug={slug}
            authorHandle={authorHandle}
            parentId={parentId}
            onDone={() => setOpen(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-medium uppercase tracking-widest text-ink-faint transition-colors hover:text-ink-muted"
        >
          Reply
        </button>
      )}
    </div>
  );
}
