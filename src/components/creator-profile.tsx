import { getReadContentStore } from "@/content";

export async function CreatorProfile({ handle }: { handle: string }) {
  const profile = await (await getReadContentStore())?.getProfile(handle);
  if (!profile) return null;
  const { displayName, bio } = profile;
  if (!displayName && !bio) return null;

  return (
    <section>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        {displayName || `@${handle}`}
      </h1>
      {bio ? (
        <p className="mt-3 max-w-md font-serif text-lg leading-relaxed text-ink-muted">
          {bio}
        </p>
      ) : null}
    </section>
  );
}
