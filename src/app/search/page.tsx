import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";
import { HighlightText } from "@/components/highlight-text";
import { getDisplayNameMap } from "@/lib/display-name";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
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

      <form action="/search" method="get" className="relative flex items-stretch gap-2">
        <MagnifyingGlass
          size={16}
          weight="duotone"
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-faint"
        />
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search posts…"
            aria-label="Search posts"
            className="field min-w-0 w-full pl-10 pr-12"
          />
          {!query ? (
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line-strong bg-paper-deep px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-faint"
            >
              ⌘K
            </kbd>
          ) : null}
        </div>
        <button
          type="submit"
          className="btn-primary shrink-0 px-5"
        >
          Search
        </button>
        {query ? (
          <Link
            href="/search"
            transitionTypes={["nav-back"]}
            className="btn-ghost shrink-0 px-4"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {!query ? (
        <Reveal as="section" className="mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Popular topics
          </p>
          {tags.length > 0 ? (
            <>
              <div className="mt-5 flex max-w-3xl flex-wrap items-baseline gap-x-5 gap-y-3">
                {tags.slice(0, 14).map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/tag/${encodeURIComponent(tag.name)}`}
                    transitionTypes={["nav-forward"]}
                    className="group press inline-block font-serif font-medium text-ink transition-[transform,color] duration-[var(--dur-short)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:text-seal"
                  >
                    <span className="text-seal">#</span>
                    {tag.name}
                    <span className="ml-1.5 font-sans text-[0.6875rem] font-normal text-ink-faint tabular-nums transition-colors duration-[var(--dur-short)] group-hover:text-seal/70">
                      {tag.count}
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-6 text-sm text-ink-muted">
                Or search above to find words across every shelf.
              </p>
            </>
          ) : (
            <div className="mt-5 rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
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
