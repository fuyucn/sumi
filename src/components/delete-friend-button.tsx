"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFriendAction } from "@/app/community/actions";

export function DeleteFriendButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "deleted">("idle");

  async function onClick() {
    if (state !== "idle" || !window.confirm("Remove this friend link?")) return;
    setState("busy");
    const res = await deleteFriendAction({ id });
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
      aria-label="Remove friend"
    >
      {state === "busy" ? "Removing…" : "Remove"}
    </button>
  );
}
