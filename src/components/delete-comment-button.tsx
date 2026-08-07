"use client";

import { useState } from "react";
import { deleteCommentAction } from "@/app/community/actions";

export function DeleteCommentButton({
  postHandle,
  slug,
  commentId,
}: {
  postHandle: string;
  slug: string;
  commentId: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "deleted">("idle");

  async function onClick() {
    if (state !== "idle" || !window.confirm("Delete this comment?")) return;
    setState("busy");
    const res = await deleteCommentAction({ postHandle, slug, commentId });
    setState(res.ok ? "deleted" : "idle");
    if (!res.ok) window.alert(res.error);
  }

  if (state === "deleted") return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "busy"}
      className="text-xs text-ink-faint underline-offset-2 transition-colors hover:text-ink"
    >
      {state === "busy" ? "Deleting…" : "Delete"}
    </button>
  );
}
