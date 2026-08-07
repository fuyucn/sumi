"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAction } from "@/app/community/actions";

export function ProfileForm({
  initial,
  handle,
}: {
  initial?: { displayName?: string; bio?: string };
  handle: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await saveProfileAction({ displayName, bio });
          if (result.ok) {
            setSaved(true);
            if (savedTimer.current) clearTimeout(savedTimer.current);
            savedTimer.current = setTimeout(() => setSaved(false), 2500);
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
      className="max-w-md space-y-3"
    >
      <div>
        <label
          htmlFor="display-name"
          className="text-sm font-medium text-ink-muted"
        >
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={`@${handle}`}
          className="field mt-1"
        />
        <p className="mt-1 text-xs text-ink-faint">
          留空时对外显示为 @{handle}
        </p>
      </div>
      <div>
        <label htmlFor="bio" className="text-sm font-medium text-ink-muted">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="A few words about you and your writing"
          className="field mt-1 resize-y"
        />
      </div>
      {error ? <p className="text-sm text-seal">{error}</p> : null}
      {saved ? <p className="text-sm text-ink-faint">Saved</p> : null}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
