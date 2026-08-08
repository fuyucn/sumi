import { getReadContentStore } from "@/content";
import { displayName } from "@/lib/display-name";

export async function CreatorProfile({ handle }: { handle: string }) {
  const profile = await (await getReadContentStore())?.getProfile(handle);
  const name = displayName(handle, profile);
  const bio = profile?.bio?.trim();

  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden
        className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-seal font-serif text-2xl font-semibold text-paper shadow-sm"
      >
        {Array.from(name.replace(/^@/, ""))[0] ?? "墨"}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">Profile</p>
        <h1 className="mt-1.5 truncate font-serif text-4xl font-semibold tracking-tight text-ink">
          {name}
        </h1>
        {bio ? (
          <p className="mt-3 max-w-md font-serif text-lg leading-relaxed text-ink-muted">
            {bio}
          </p>
        ) : null}
      </div>
    </div>
  );
}
