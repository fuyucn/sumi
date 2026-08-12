import Link from "next/link";
import { listFeed, type FeedItem } from "@/content/feed";
import { getDisplayNameMap } from "@/lib/display-name";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { ArchiveRail } from "@/components/archive-rail";
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

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export default async function PostsPage() {
  const feed = await listFeed();
  const names = await getDisplayNameMap(feed.map(({ handle }) => handle));
  const groups = groupByYear(feed);

  return (
    <PageTransition>
      <main className="mx-auto max-w-4xl px-5 pt-16 pb-24 sm:px-8">
        <header className="page-head">
          <span className="eyebrow">
            <span aria-hidden className="dot" />
            The archive
          </span>
          <h1>Posts</h1>
          <p>
            Every essay, note and experiment filed by year. Read them in
            order, or jump straight to a subject you care about.
          </p>
          <div className="index-stats">
            <span>
              <b>{feed.length}</b>
              <em>{feed.length === 1 ? "essay" : "essays"}</em>
            </span>
            <i aria-hidden />
            <span>
              <b>{groups.length}</b>
              <em>{groups.length === 1 ? "year" : "years"}</em>
            </span>
            <i aria-hidden />
            <span>
              <b>{names.size}</b>
              <em>authors</em>
            </span>
          </div>
        </header>

        {groups.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={<Article size={20} weight="duotone" />}
            title="Nothing published yet."
            hint="Posts will collect here as they go live."
          />
        ) : (
          <div className="archive mt-14">
            <ArchiveRail
              years={groups.map(({ year, posts }) => ({
                year,
                count: posts.length,
              }))}
            />
            <div>
              {groups.map(({ year, posts }) => (
                <section
                  key={year}
                  id={`y${year}`}
                  className="year-group scroll-mt-28"
                >
                  <h2 className="year-label">{year}</h2>
                  <div className="divide-y divide-line border-t border-line">
                    {posts.map(({ handle, post }, i) => (
                      <Reveal
                        key={`${handle}/${post.slug}`}
                        delay={Math.min(i * 0.04, 0.24)}
                      >
                        <article className="group relative grid grid-cols-[auto_1fr] items-baseline gap-x-6 py-5 sm:grid-cols-[auto_1fr_auto]">
                          <Link
                            href={`/@${handle}/${post.slug}`}
                            transitionTypes={["nav-forward"]}
                            className="absolute inset-0 z-0"
                            aria-label={post.title}
                          />
                          <span className="essay-date pt-0.5">
                            {post.publishedAt
                              ? formatMonthYear(post.publishedAt)
                              : "Undated"}
                          </span>
                          <div className="pointer-events-none relative z-10 min-w-0">
                            <Link
                              href={`/@${handle}/${post.slug}`}
                              transitionTypes={["nav-forward"]}
                              className="pointer-events-auto block"
                              aria-label={post.title}
                            >
                              <h3 className="essay-title">{post.title}</h3>
                            </Link>
                            <div className="essay-meta mt-2">
                              {post.agent ? (
                                <span
                                  className="agent-chip"
                                  title="由 autonomous agent 协作写作"
                                >
                                  <span className="dot" aria-hidden />
                                  Agent
                                </span>
                              ) : null}
                              <Link
                                href={`/@${handle}`}
                                transitionTypes={["nav-forward"]}
                                className="link-underline pointer-events-auto font-medium text-ink-muted transition-colors hover:text-ink"
                              >
                                {names.get(handle)}
                              </Link>
                              {post.tags.map((t) => (
                                <Link
                                  key={t}
                                  href={`/tag/${encodeURIComponent(t)}`}
                                  transitionTypes={["nav-forward"]}
                                  className="pointer-events-auto"
                                >
                                  <span className="tag-chip">{t}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                          <span
                            aria-hidden
                            className="essay-arrow hidden sm:grid"
                          >
                            →
                          </span>
                        </article>
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
