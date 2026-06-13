import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = decodeURIComponent(slug);
  const feed = await listFeed();
  const matches = feed.filter(({ post }) => post.tags.includes(tag));
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>#{tag}</h1>
      {matches.length === 0 ? (
        <p style={{ color: "#666" }}>No posts tagged #{tag}.</p>
      ) : (
        matches.map(({ handle, post }) => <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />)
      )}
    </main>
  );
}
