import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getReadContentStore } from "@/content";
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";
import { Reveal } from "@/components/reveal";
import { getDisplayNameMap } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function Home() {
  const feed = await listFeed();
  const store = await getReadContentStore();
  const names = await getDisplayNameMap(feed.map(({ handle }) => handle));
  const tags = (await store?.listTags()) ?? [];
  const creators = new Set(feed.map(({ handle }) => handle)).size;
  const totalTags = tags.reduce((sum, t) => sum + t.count, 0);
  const maxTagCount = Math.max(1, ...tags.map((t) => t.count));
  const featured = feed[0];
  const cover = featured?.post.coverImage;
  const coverSrc = cover?.startsWith("http") ? cover : undefined;
  // The featured card already shows feed[0]; don't repeat it in the list.
  const recent = featured ? feed.slice(1, 7) : feed.slice(0, 6);

  const tagSize = (count: number) => {
    const ratio = count / maxTagCount;
    if (ratio >= 0.8) return "text-lg";
    if (ratio >= 0.5) return "text-base";
    return "text-sm";
  };

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-24">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="rise">
          <h1 className="font-serif text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight text-ink text-balance">
            A quiet place to write
            <span className="text-seal">.</span>
          </h1>
          <p className="mt-5 max-w-md font-serif text-lg leading-relaxed text-ink-muted">
            Your words, inked onto warm paper and kept in your own quiet
            space. Write, note, and share at your own pace.
          </p>
          <Link
            href="/write"
            className="btn-primary group mt-8 px-6 py-3"
          >
            Start writing
            <ArrowRight
              size={16}
              weight="duotone"
              aria-hidden
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <aside className="rise rise-delay-1">
          {featured && coverSrc ? (
            <Link
              href={`/@${featured.handle}/${featured.post.slug}`}
              className="group block overflow-hidden rounded-card border border-line bg-paper-raised shadow-card transition-shadow hover:shadow-card-hover"
            >
              <img
                src={coverSrc}
                alt={featured.post.title}
                width={1200}
                height={800}
                className="aspect-[3/2] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
                  Latest ink
                </p>
                <h2 className="mt-2 font-serif text-xl font-medium leading-snug tracking-tight text-ink transition-colors group-hover:text-seal">
                  {featured.post.title}
                </h2>
                <p className="mt-1.5 text-sm text-ink-faint">
                  {names.get(featured.handle)}
                  {featured.post.publishedAt
                    ? ` · ${new Date(featured.post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
            </Link>
          ) : (
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
                Write in the editor, publish to your own space, and let the
                seal mark the words you chose to keep.
              </p>
            </div>
          )}
        </aside>
      </section>

      <Reveal as="section">
        <dl className="mt-14 grid grid-cols-3 divide-x divide-line border-y border-line">
          {[
            { label: "Posts", value: feed.length },
            { label: "Writers", value: creators },
            { label: "Tags", value: totalTags },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-5 sm:px-8">
              <dt className="text-xs tracking-wide text-ink-faint">{stat.label}</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

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
          <Reveal as="div" className="divide-y divide-line">
            {recent.map(({ handle, post }) => (
              <PostCard
                key={`${handle}/${post.slug}`}
                handle={handle}
                post={post}
                authorName={names.get(handle)}
              />
            ))}
          </Reveal>
        )}
      </section>

      {tags.length > 0 ? (
        <Reveal as="section" className="mt-20">
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
        </Reveal>
      ) : null}
    </main>
  );
}
