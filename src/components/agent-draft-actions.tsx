"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveAgentDraftAction, deleteAgentDraftAction } from "@/app/write/agent-actions";

export function AgentDraftActions({ handle, slug }: { handle: string; slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: (handle: string, slug: string) => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action(handle, slug);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-xs text-seal">{error}</span> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(approveAgentDraftAction)}
        className="rounded-full bg-seal px-3 py-1 text-sm font-medium text-paper transition-colors hover:bg-seal/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "…" : "Approve & publish"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(deleteAgentDraftAction)}
        className="text-sm text-ink-faint transition-colors hover:text-seal disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
