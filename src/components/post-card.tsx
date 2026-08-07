import Link from "next/link";
import type { PostMeta } from "@/content/types";

export function PostCard({ handle, post }: { handle: string; post: PostMeta }) {
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
        className="pt-1 text-sm text-ink-faint tabular-nums sm:pt-1.5"
      >
        {date}
      </time>
      <div className="relative z-10">
        <h2 className="font-serif text-2xl font-medium leading-snug tracking-tight text-ink transition-all duration-300 group-hover:translate-x-1 group-hover:text-seal">
          {post.title}
        </h2>
        {post.excerpt ? (
          <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-ink-muted line-clamp-2">
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
          <Link
            href={`/@${handle}`}
            className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
          >
            @{handle}
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
                className="transition-colors hover:text-seal"
              >
                #{t}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
