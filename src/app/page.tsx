import Link from "next/link";
import { getReadContentStore } from "@/content";
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const feed = await listFeed();
  const store = await getReadContentStore();
  const tags = (await store?.listTags()) ?? [];
  const creators = new Set(feed.map(({ handle }) => handle)).size;
  const totalTags = tags.reduce((sum, t) => sum + t.count, 0);
  const maxTagCount = Math.max(1, ...tags.map((t) => t.count));

  const tagSize = (count: number) => {
    const ratio = count / maxTagCount;
    if (ratio >= 0.8) return "text-lg";
    if (ratio >= 0.5) return "text-base";
    return "text-sm";
  };

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-24">
      <section className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <div className="rise">
          <h1 className="font-serif text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight text-ink text-balance">
            A quiet place to write
            <span className="text-seal">.</span>
          </h1>
          <p className="mt-5 max-w-md font-serif text-lg leading-relaxed text-ink-muted">
            Sumi is your own corner of the web. Words set in ink, committed to
            Git, read by anyone who slows down enough to stay a while.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-5">
            <div>
              <dt className="text-xs tracking-wide text-ink-faint">Posts</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink tabular-nums">
                {feed.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-ink-faint">Writers</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink tabular-nums">
                {creators}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-ink-faint">Tags</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink tabular-nums">
                {totalTags}
              </dd>
            </div>
          </dl>
        </div>

        <aside className="rise rise-delay-1">
          <div className="rounded-card border border-line bg-paper-raised p-8 shadow-card lg:mb-4">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-seal font-serif text-3xl font-semibold text-paper shadow-sm"
            >
              墨
            </div>
            <h2 className="mt-6 font-serif text-2xl font-semibold tracking-tight text-ink">
              Ink on paper
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Write in the editor, publish to your own repository, and let the
              seal mark the words you chose to keep.
            </p>
            <Link
              href="/write"
              className="press mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
            >
              Start writing
            </Link>
          </div>
        </aside>
      </section>

      <section className="mt-20 lg:mt-28">
        <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
            Latest ink
          </h2>
          <Link
            href="/search"
            className="link-underline text-sm text-ink-faint transition-colors hover:text-ink-muted"
          >
            Explore all
          </Link>
        </div>

        {feed.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-lg text-ink-muted">
              Nothing published yet.
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              The first page is always blank. Be the one to fill it.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {feed.slice(0, 6).map(({ handle, post }) => (
              <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />
            ))}
          </div>
        )}
      </section>

      {tags.length > 0 ? (
        <section className="mt-20">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
            Filed under
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {tags.length} {tags.length === 1 ? "topic" : "topics"}, most used
            first.
          </p>
          <div className="mt-7 flex max-w-3xl flex-wrap items-baseline gap-x-5 gap-y-3">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                className={`${tagSize(tag.count)} press font-serif font-medium text-ink transition-colors hover:text-seal`}
              >
                <span className="text-seal">#</span>
                {tag.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
