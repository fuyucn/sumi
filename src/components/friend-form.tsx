"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFriendAction } from "@/app/community/actions";

export function FriendForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          } else {
            setError(result.error);
          }
        });
      }}
      className="grid gap-3 rounded border border-line-strong bg-paper p-4 shadow-sm sm:grid-cols-2"
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
          className="mt-1 w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-seal"
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
          className="mt-1 w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-seal"
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
          className="mt-1 w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-seal"
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
          className="mt-1 w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-seal"
        />
      </div>
      {error ? <p className="text-sm text-seal sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending || name.trim().length === 0 || url.trim().length === 0}
          className="press rounded-full bg-ink px-4 py-1.5 font-medium text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add friend"}
        </button>
      </div>
    </form>
  );
}
