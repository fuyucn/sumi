"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveAgentDraftAction, deleteAgentPostAction } from "@/app/write/agent-actions";

type ActionResult = { ok: boolean; error?: string };

export function PostRowActions({
  handle,
  slug,
  status,
  isAgent,
}: {
  handle: string;
  slug: string;
  status: "draft" | "published";
  isAgent: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editHref = `/write/${slug}${isAgent ? `?agent=${encodeURIComponent(handle)}` : ""}`;

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-3">
      {error ? <span className="max-w-40 text-xs text-seal">{error}</span> : null}
      <Link href={editHref} className="btn-ghost px-3 py-1">
        Edit
      </Link>
      {status === "published" ? (
        <Link
          href={`/@${handle}/${slug}`}
          className="text-sm text-ink-faint transition-colors hover:text-ink-muted"
        >
          View
        </Link>
      ) : null}
      {isAgent && status === "draft" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => approveAgentDraftAction(handle, slug))}
          className="btn-seal"
        >
          {isPending ? "…" : "Approve & publish"}
        </button>
      ) : null}
      {isAgent ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => deleteAgentPostAction(handle, slug))}
          className="text-sm text-ink-faint transition-colors hover:text-seal disabled:opacity-50"
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}
