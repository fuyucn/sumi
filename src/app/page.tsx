import Link from "next/link";
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, feed] = await Promise.all([getCurrentUser(), listFeed()]);
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Sumi 墨</h1>
        <span>{user ? `@${(user as { username?: string }).username ?? user.name}` : <Link href="/sign-in">Sign in</Link>}</span>
      </header>
      {feed.length === 0 ? (
        <p style={{ color: "#666" }}>No published posts yet.</p>
      ) : (
        feed.map(({ handle, post }) => <PostCard key={`${handle}/${post.slug}`} handle={handle} post={post} />)
      )}
    </main>
  );
}
