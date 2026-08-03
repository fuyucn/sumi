import { getReadContentStore } from "@/content";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const store = await getReadContentStore();
  const tags = (await store?.listTags()) ?? [];

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-ink-faint">
          Browse
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-ink">
          Tags
        </h1>
      </header>
      {tags.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          No tags yet.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {tags.map((tag) => (
            <a
              key={tag.name}
              href={`/tag/${encodeURIComponent(tag.name)}`}
              className="group flex items-baseline justify-between py-4 transition-colors hover:text-seal"
            >
              <span className="font-serif text-lg text-ink transition-colors group-hover:text-seal">
                <span className="text-seal">#</span>
                {tag.name}
              </span>
              <span className="text-sm text-ink-faint">
                {tag.count} {tag.count === 1 ? "post" : "posts"}
              </span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
