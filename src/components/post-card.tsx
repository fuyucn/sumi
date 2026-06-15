import Link from "next/link";
import type { PostMeta } from "@/content/types";

export function PostCard({ handle, post }: { handle: string; post: PostMeta }) {
  return (
    <article className="py-6">
      <h2 className="font-serif text-xl font-medium leading-snug">
        <Link href={`/@${handle}/${post.slug}`} className="text-stone-900 hover:underline">
          {post.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        <Link href={`/@${handle}`} className="hover:text-stone-900 transition-colors">
          @{handle}
        </Link>
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>
      {post.excerpt ? (
        <p className="mt-2 text-stone-600 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
      ) : null}
      {post.tags.length > 0 ? (
        <p className="mt-2 flex flex-wrap gap-3">
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/tag/${encodeURIComponent(t)}`}
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              #{t}
            </Link>
          ))}
        </p>
      ) : null}
    </article>
  );
}
