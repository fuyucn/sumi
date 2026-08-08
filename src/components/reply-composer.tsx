"use client";
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
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
        <div className="panel-enter mt-3 rounded-card border border-line bg-paper px-4 py-3">
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
          className="press mt-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-ink-faint transition-colors hover:text-ink-muted"
        >
          Reply
          <CaretDown size={11} weight="bold" aria-hidden />
        </button>
      )}
    </div>
  );
}
