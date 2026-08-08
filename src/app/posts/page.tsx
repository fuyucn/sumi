import Link from "next/link";
import { listFeed, type FeedItem } from "@/content/feed";
import { getDisplayNameMap } from "@/lib/display-name";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { Article } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

function groupByYear(feed: FeedItem[]) {
  const groups = new Map<string, FeedItem[]>();
  for (const item of feed) {
    const year = item.post.publishedAt
      ? new Date(item.post.publishedAt).getFullYear().toString()
      : "Undated";
    const list = groups.get(year) ?? [];
    list.push(item);
    groups.set(year, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, posts]) => ({ year, posts }));
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function PostsPage() {
  const feed = await listFeed();
  const names = await getDisplayNameMap(feed.map(({ handle }) => handle));
  const groups = groupByYear(feed);

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
          Shelf
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          Posts
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Every published post, ordered by year.
          {feed.length > 0
            ? ` ${feed.length} ${feed.length === 1 ? "post" : "posts"} in the shelves.`
            : ""}
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Article size={20} weight="duotone" />}
          title="Nothing published yet."
          hint="Posts will collect here as they go live."
        />
      ) : (
        <div className="space-y-14">
          {groups.map(({ year, posts }) => (
            <section key={year}>
              <h2 className="flex items-baseline gap-3 font-serif text-3xl font-semibold tracking-tight text-ink">
                {year}
                <span className="text-sm font-sans font-normal text-ink-faint tabular-nums">
                  {posts.length}
                </span>
              </h2>
              <div className="mt-6 divide-y divide-line border-t border-line">
                {posts.map(({ handle, post }, i) => (
                  <Reveal
                    key={`${handle}/${post.slug}`}
                    delay={Math.min(i * 0.05, 0.3)}
                  >
                    <div className="group relative grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-8">
                      {post.publishedAt ? (
                        <time
                          dateTime={post.publishedAt}
                          className="pt-0.5 text-sm text-ink-faint tabular-nums transition-colors duration-[var(--dur-short)] group-hover:text-seal/80"
                        >
                          {formatDay(post.publishedAt)}
                        </time>
                      ) : (
                        <span className="pt-0.5 text-sm text-ink-faint transition-colors duration-[var(--dur-short)] group-hover:text-seal/80">
                          Undated
                        </span>
                      )}
                      <div>
                        <Link
                          href={`/@${handle}/${post.slug}`}
                          className="link-underline font-serif text-lg font-medium leading-snug text-ink transition-[background-size,color,transform] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0.5 hover:text-seal"
                        >
                          {post.title}
                        </Link>
                        <p className="mt-1 text-sm text-ink-faint">
                          {names.get(handle)}
                          {post.tags.length > 0
                            ? ` · ${post.tags.map((t) => `#${t}`).join(" ")}`
                            : ""}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-2 font-serif text-lg text-seal opacity-0 transition-[transform,opacity] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:opacity-100 md:block"
                      >
                        →
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      </main>
    </PageTransition>
  );
}
