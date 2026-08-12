import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";
import { HighlightText } from "@/components/highlight-text";
import { getDisplayNameMap } from "@/lib/display-name";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { SearchForm } from "@/components/search-form";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";

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
  const tags = (await store?.listTags()) ?? [];

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24">
      <header className="page-head mb-14">
        <span className="eyebrow">
          <span aria-hidden className="dot" />
          Find
        </span>
        <h1>
          Search the <em>shelves</em>
        </h1>
        <p>Find words across every shelf, title, body and tag.</p>
      </header>

      <SearchForm query={query} />

      {!query ? (
        <Reveal as="section" className="mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Popular topics
          </p>
          {tags.length > 0 ? (
            <>
              <div className="tags-deck mt-6 max-w-3xl">
                {tags.slice(0, 14).map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/tag/${encodeURIComponent(tag.name)}`}
                    transitionTypes={["nav-forward"]}
                    className="tag"
                  >
                    <span aria-hidden className="text-seal">
                      #
                    </span>
                    {tag.name}
                    <small>{tag.count}</small>
                  </Link>
                ))}
              </div>
              <p className="mt-7 text-sm text-ink-muted">
                Or search above to find words across every shelf.
              </p>
            </>
          ) : (
            <div className="mt-5 border-t border-line pt-8">
              <p className="font-serif text-lg text-ink-soft">
                The shelves are still quiet.
              </p>
              <p className="mt-1.5 text-sm text-ink-faint">
                Search will light up as posts are published.
              </p>
            </div>
          )}
        </Reveal>
      ) : (
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
                    transitionTypes={["nav-forward"]}
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
      )}
      </main>
    </PageTransition>
  );
}
