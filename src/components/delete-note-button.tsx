"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteNoteAction } from "@/app/community/actions";

export function DeleteNoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "deleted">("idle");

  async function onClick() {
    if (state !== "idle" || !window.confirm("Delete this note?")) return;
    setState("busy");
    const res = await deleteNoteAction({ id });
    if (res.ok) {
      setState("deleted");
      router.refresh();
    } else {
      setState("idle");
      window.alert(res.error);
    }
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
