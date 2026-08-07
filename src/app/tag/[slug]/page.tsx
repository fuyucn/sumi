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
  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          <span className="text-seal">#</span>
          {tag}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          {matches.length} {matches.length === 1 ? "post" : "posts"} under this
          topic.
        </p>
      </header>
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
