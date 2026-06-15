import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = decodeURIComponent(slug);
  const feed = await listFeed();
  const matches = feed.filter(({ post }) => post.tags.includes(tag));
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-serif text-2xl font-medium text-stone-900 mb-8">#{tag}</h1>
      {matches.length === 0 ? (
        <p className="text-stone-500 text-center py-16">No posts tagged #{tag}.</p>
      ) : (
        <div className="divide-y divide-stone-200">
          {matches.map(({ handle, post }) => (
            <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
