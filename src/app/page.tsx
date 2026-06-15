import Link from "next/link";
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, feed] = await Promise.all([getCurrentUser(), listFeed()]);
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-medium text-stone-900">Feed</h1>
        <span className="text-sm text-stone-600">
          {user ? (
            <>
              <Link href={`/@${(user as { username?: string }).username ?? user.name}`} className="hover:text-stone-900 transition-colors">
                @{(user as { username?: string }).username ?? user.name}
              </Link>
              {" · "}
              <Link href="/write" className="hover:text-stone-900 transition-colors">Write</Link>
            </>
          ) : (
            <Link href="/sign-in" className="hover:text-stone-900 transition-colors">Sign in</Link>
          )}
        </span>
      </div>
      {feed.length === 0 ? (
        <p className="text-stone-500 text-center py-16">Nothing published yet — be the first to write.</p>
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
