import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";
import { getDisplayNameMap } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const store = await getReadContentStore();
  const results = query ? (await store?.searchPosts(query)) ?? [] : null;
  const names = results ? await getDisplayNameMap(results.map(({ handle }) => handle)) : new Map<string, string>();

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Search
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Find words across every shelf, title, body and tag.
        </p>
      </header>

      <form action="/search" method="get" className="flex items-stretch gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search posts…"
          aria-label="Search posts"
          className="field min-w-0 flex-1"
        />
        <button
          type="submit"
          className="btn-primary shrink-0 px-5"
        >
          Search
        </button>
      </form>

      {query ? (
        <div className="mt-10">
          <p className="text-sm text-ink-muted">
            {results && results.length > 0
              ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`
              : `No results for “${query}”.`}
          </p>
          {results && results.length > 0 ? (
            <div className="mt-4 divide-y divide-line border-t border-line">
              {results.map(({ handle, post }) => (
                <PostCard
                  key={`${handle}/${post.slug}`}
                  handle={handle}
                  post={post}
                  authorName={names.get(handle)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
