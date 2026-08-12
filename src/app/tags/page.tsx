import { getReadContentStore } from "@/content";
import { TagsExplorer } from "@/components/tags-explorer";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { Tag } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const store = await getReadContentStore();
  const tags = (await store?.listTags()) ?? [];

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-5 pt-16 pb-24">
      <header className="page-head mb-14">
        <span className="eyebrow">
          <span aria-hidden className="dot" />
          Topics
        </span>
        <h1>
          Tag <em>library</em>
        </h1>
        <p>
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
    </PageTransition>
  );
}
