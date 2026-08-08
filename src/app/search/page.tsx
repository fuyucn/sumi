import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";
import { HighlightText } from "@/components/highlight-text";
import { getDisplayNameMap } from "@/lib/display-name";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";

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
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
          Find
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
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
              ? (
                  <>
                    {results.length} {results.length === 1 ? "result" : "results"} for{" "}
                    <HighlightText
                      text={query}
                      query={query}
                      className="rounded-[3px] bg-seal-wash px-1 text-ink"
                    />
                  </>
                )
              : (
                  <>
                    No results for{" "}
                    <HighlightText
                      text={query}
                      query={query}
                      className="rounded-[3px] bg-seal-wash px-1 text-ink"
                    />
                    .
                  </>
                )}
          </p>
          {results && results.length > 0 ? (
            <div className="mt-4 divide-y divide-line border-t border-line">
              {results.map(({ handle, post }, i) => (
                <Reveal
                  key={`${handle}/${post.slug}`}
                  delay={Math.min(i * 0.05, 0.3)}
                >
                  <PostCard
                    handle={handle}
                    post={post}
                    authorName={names.get(handle)}
                    highlight={query}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              icon={<MagnifyingGlass size={20} weight="duotone" />}
              title="Nothing on this shelf."
              hint={
                <>
                  Try a different keyword, or{" "}
                  <Link
                    href="/posts"
                    className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    browse all posts
                  </Link>
                  .
                </>
              }
            />
          )}
        </div>
      ) : null}
    </main>
  );
}
