import Link from "next/link";
import { listFeed, type FeedItem } from "@/content/feed";

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

export default async function ArchivePage() {
  const feed = await listFeed();
  const groups = groupByYear(feed);

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Archive
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Every published post, ordered by year.
          {feed.length > 0
            ? ` ${feed.length} ${feed.length === 1 ? "post" : "posts"} in the shelves.`
            : ""}
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          Nothing archived yet.
        </p>
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
                {posts.map(({ handle, post }) => (
                  <div
                    key={`${handle}/${post.slug}`}
                    className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-8"
                  >
                    {post.publishedAt ? (
                      <time
                        dateTime={post.publishedAt}
                        className="pt-0.5 text-sm text-ink-faint tabular-nums"
                      >
                        {formatDay(post.publishedAt)}
                      </time>
                    ) : (
                      <span className="pt-0.5 text-sm text-ink-faint">Undated</span>
                    )}
                    <div>
                      <Link
                        href={`/@${handle}/${post.slug}`}
                        className="link-underline font-serif text-lg font-medium leading-snug text-ink transition-colors hover:text-seal"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-1 text-sm text-ink-faint">
                        @{handle}
                        {post.tags.length > 0
                          ? ` · ${post.tags.map((t) => `#${t}`).join(" ")}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
