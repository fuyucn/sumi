import Link from "next/link";
import type { PostMeta } from "@/content/types";

export function PostCard({
  handle,
  post,
  authorName,
}: {
  handle: string;
  post: PostMeta;
  authorName?: string;
}) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <article className="group relative grid gap-2 py-7 sm:grid-cols-[7rem_1fr] sm:gap-8 sm:py-8">
      <Link
        href={`/@${handle}/${post.slug}`}
        className="absolute inset-0 z-0"
        aria-label={post.title}
      />
      <time
        dateTime={post.publishedAt}
        className="pt-1 text-sm text-ink-faint tabular-nums transition-colors duration-300 group-hover:text-seal/80 sm:pt-1.5"
      >
        {date}
      </time>
      <div className="pointer-events-none relative z-10">
        <Link
          href={`/@${handle}/${post.slug}`}
          className="pointer-events-auto block"
          aria-label={post.title}
        >
          <h2 className="font-serif text-2xl font-medium leading-snug tracking-tight text-ink transition-all duration-300 group-hover:translate-x-1 group-hover:text-seal">
            {post.title}
          </h2>
        </Link>
        {post.excerpt ? (
          <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-ink-muted line-clamp-2">
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
          <Link
            href={`/@${handle}`}
            className="link-underline pointer-events-auto font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {authorName || `@${handle}`}
          </Link>
          {post.agent ? (
            <span className="rounded-full border border-seal/40 px-2 py-0.5 text-xs font-medium text-seal">
              Agent
            </span>
          ) : null}
        </div>
        {post.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-faint">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/tag/${encodeURIComponent(t)}`}
                className="pointer-events-auto transition-colors hover:text-seal"
              >
                #{t}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-2 font-serif text-xl text-seal opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 md:block"
      >
        →
      </span>
    </article>
  );
}
