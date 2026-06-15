import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const feed = await listFeed();
  return (
    <main className="max-w-2xl mx-auto px-5 py-16">
      {feed.length === 0 ? (
        <p className="text-stone-500 text-center py-24">
          Nothing published yet — be the first to write.
        </p>
      ) : (
        <div className="divide-y divide-stone-200">
          {feed.map(({ handle, post }) => (
            <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
