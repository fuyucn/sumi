import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";
import { CreatorProfile } from "@/components/creator-profile";
import { CreatorMagazines } from "@/components/creator-magazines";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  // Next delivers the param URL-encoded (e.g. "%40fuyucn"); decode before checks.
  const handleParam = decodeURIComponent(raw);
  if (!handleParam.startsWith("@")) notFound();
  const handle = handleParam.slice(1);
  const store = await getReadContentStore();
  if (!store) notFound();
  const posts = await store.listPosts({ handle, status: "published" });
  const profile = await store.getProfile(handle);
  const hasProfile = !!(profile && (profile.displayName || profile.bio));
  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-10">
        {hasProfile ? (
          <CreatorProfile handle={handle} />
        ) : (
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            @{handle}
          </h1>
        )}
        <p className="mt-2 text-sm text-ink-faint">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </header>
      {posts.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          Nothing published yet.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {posts.map((post) => (
            <PostCard key={post.slug} handle={handle} post={post} />
          ))}
        </div>
      )}
      <CreatorMagazines handle={handle} />
    </main>
  );
}
