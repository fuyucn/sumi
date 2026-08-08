"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFriendAction } from "@/app/community/actions";
import { Check } from "@phosphor-icons/react";

export function FriendForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addFriendAction({
            name,
            url,
            ...(avatar.trim() ? { avatar: avatar.trim() } : {}),
            ...(bio.trim() ? { bio: bio.trim() } : {}),
          });
          if (result.ok) {
            setName("");
            setUrl("");
            setAvatar("");
            setBio("");
            router.refresh();
            setAdded(true);
            if (addedTimer.current) clearTimeout(addedTimer.current);
            addedTimer.current = setTimeout(() => setAdded(false), 2200);
          } else {
            setError(result.error);
          }
        });
      }}
      className="card grid gap-3 p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="friend-name" className="block text-sm text-ink-muted">
          Name
        </label>
        <input
          id="friend-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Moe"
          className="field mt-1"
        />
      </div>
      <div>
        <label htmlFor="friend-url" className="block text-sm text-ink-muted">
          URL
        </label>
        <input
          id="friend-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="field mt-1"
        />
      </div>
      <div>
        <label htmlFor="friend-avatar" className="block text-sm text-ink-muted">
          Avatar URL
        </label>
        <input
          id="friend-avatar"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://example.com/avatar.png"
          className="field mt-1"
        />
      </div>
      <div>
        <label htmlFor="friend-bio" className="block text-sm text-ink-muted">
          Bio
        </label>
        <input
          id="friend-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="One line about them"
          className="field mt-1"
        />
      </div>
      {error ? <p className="text-sm text-seal sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending || added || name.trim().length === 0 || url.trim().length === 0}
          className={added ? "btn-primary border-seal/50 bg-seal/10 text-seal" : "btn-primary"}
        >
          {isPending ? (
            "Adding…"
          ) : added ? (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ animation: "fade-in 0.22s var(--ease-out)" }}
            >
              <Check size={14} weight="bold" aria-hidden />
              Added
            </span>
          ) : (
            "Add friend"
          )}
        </button>
      </div>
    </form>
  );
}
