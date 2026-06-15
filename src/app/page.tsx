import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const feed = await listFeed();
  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-12">
        <h1 className="font-serif text-[2rem] sm:text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-ink">
          A quiet place to read
          <span className="text-seal">.</span>
        </h1>
        <p className="mt-3 max-w-md font-serif text-lg leading-relaxed text-ink-muted">
          Writing worth slowing down for — set in ink, kept in Git, with nothing
          else in the way.
        </p>
      </header>

      {feed.length === 0 ? (
        <div className="border-t border-line py-24 text-center">
          <p className="font-serif text-lg text-ink-muted">
            Nothing published yet.
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            The first page is always blank — be the one to fill it.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {feed.map(({ handle, post }) => (
            <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
