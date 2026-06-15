import Link from "next/link";
import type { PostMeta } from "@/content/types";

export function PostCard({ handle, post }: { handle: string; post: PostMeta }) {
  return (
    <article className="group relative py-8 first:pt-0">
      <Link
        href={`/@${handle}/${post.slug}`}
        className="absolute inset-0 z-0"
        aria-label={post.title}
      />
      <h2 className="font-serif text-2xl font-medium leading-snug tracking-tight text-ink transition-colors group-hover:text-seal">
        {post.title}
      </h2>
      {post.excerpt ? (
        <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-ink-muted line-clamp-2">
          {post.excerpt}
        </p>
      ) : null}
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
        <Link
          href={`/@${handle}`}
          className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
        >
          @{handle}
        </Link>
        {post.publishedAt ? (
          <>
            <span aria-hidden className="text-line-strong">·</span>
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          </>
        ) : null}
        {post.tags.length > 0 ? (
          <>
            <span aria-hidden className="text-line-strong">·</span>
            <span className="flex flex-wrap gap-3">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/tag/${encodeURIComponent(t)}`}
                  className="transition-colors hover:text-seal"
                >
                  #{t}
                </Link>
              ))}
            </span>
          </>
        ) : null}
      </div>
    </article>
  );
}
