import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  // Next delivers the param URL-encoded (e.g. "%40fuyucn"); decode before checks.
  const handleParam = decodeURIComponent(raw);
  if (!handleParam.startsWith("@")) notFound();
  const handle = handleParam.slice(1);
  const store = getReadContentStore();
  if (!store) notFound();
  const posts = await store.listPosts({ handle, status: "published" });
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-serif text-2xl font-medium text-stone-900 mb-8">@{handle}</h1>
      {posts.length === 0 ? (
        <p className="text-stone-500 text-center py-16">Nothing published yet.</p>
      ) : (
        <div className="divide-y divide-stone-200">
          {posts.map((post) => (
            <PostCard key={post.slug} handle={handle} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
