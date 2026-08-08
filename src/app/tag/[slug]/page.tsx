import Link from "next/link";
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";
import { getDisplayNameMap } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = decodeURIComponent(slug);
  const feed = await listFeed();
  const matches = feed.filter(({ post }) => post.tags.includes(tag));
  const names = await getDisplayNameMap(matches.map(({ handle }) => handle));
  const related = new Map<string, number>();
  for (const { post } of matches) {
    for (const t of post.tags) {
      if (t !== tag) related.set(t, (related.get(t) ?? 0) + 1);
    }
  }
  const relatedTags = [...related.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <Link
        href="/tags"
        className="group inline-flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-seal"
      >
        <span
          aria-hidden
          className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5"
        >
          ←
        </span>
        All tags
      </Link>
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">Topic</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          <span className="text-seal">#</span>
          {tag}
        </h1>
        <p className="mt-3 text-sm text-ink-muted tabular-nums">
          {matches.length} {matches.length === 1 ? "post" : "posts"} under this topic
          {relatedTags.length > 0
            ? ` · ${relatedTags.length} related ${relatedTags.length === 1 ? "topic" : "topics"}`
            : ""}
          .
        </p>
      </header>
      {relatedTags.length > 0 ? (
        <div className="mb-14">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            More topics
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {relatedTags.map(([name, count]) => (
              <Link
                key={name}
                href={`/tag/${encodeURIComponent(name)}`}
                className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-muted transition-colors hover:border-seal hover:text-seal"
              >
                #{name}
                <span className="ml-1 text-xs text-ink-faint tabular-nums">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {matches.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          No posts tagged #{tag} yet.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {matches.map(({ handle, post }) => (
            <PostCard
              key={`${handle}/${post.slug}`}
              handle={handle}
              post={post}
              authorName={names.get(handle)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
