import { getReadContentStore } from "@/content";
import { TagsExplorer } from "@/components/tags-explorer";
import { EmptyState } from "@/components/empty-state";
import { Tag } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const store = await getReadContentStore();
  const tags = (await store?.listTags()) ?? [];

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
          Topics
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          Tags
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Every topic the shelves hold, from most used down.
        </p>
      </header>
      {tags.length === 0 ? (
        <EmptyState
          icon={<Tag size={20} weight="duotone" />}
          title="No tags yet."
          hint="Tags appear here as posts are published."
        />
      ) : (
        <TagsExplorer tags={tags} />
      )}
    </main>
  );
}
