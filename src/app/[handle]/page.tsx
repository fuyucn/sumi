import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  if (!raw.startsWith("@")) notFound();
  const handle = raw.slice(1);
  const store = getReadContentStore();
  if (!store) notFound();
  const posts = await store.listPosts({ handle, status: "published" });
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>@{handle}</h1>
      {posts.length === 0 ? (
        <p style={{ color: "#666" }}>No posts yet.</p>
      ) : (
        posts.map((post) => <PostCard key={post.slug} handle={handle} post={post} />)
      )}
    </main>
  );
}
