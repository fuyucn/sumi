import Link from "next/link";
import type { PostMeta } from "@/content/types";
import { HighlightText } from "@/components/highlight-text";

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3" fill="currentColor">
      <path d="M8 0c.55 3.1 1.45 4 4.55 4.55C9.45 5.1 8.55 6 8 9.1 7.45 6 6.55 5.1 3.45 4.55 6.55 4 7.45 3.1 8 0z" />
      <path d="M12.5 9.5c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5z" />
    </svg>
  );
}

export function PostCard({
  handle,
  post,
  authorName,
  highlight,
}: {
  handle: string;
  post: PostMeta;
  authorName?: string;
  /** Search query; when set, matching terms are highlighted in title/excerpt. */
  highlight?: string;
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
      {/* Editorial bookmark: a cinnabar hairline draws down the row edge on
          hover, marking the entry you are about to open. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-0 hidden w-[2px] origin-center scale-y-0 rounded-full bg-seal/60 transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:scale-y-100 md:block"
      />
      <Link
        href={`/@${handle}/${post.slug}`}
        transitionTypes={["nav-forward"]}
        className="absolute inset-0 z-0"
        aria-label={post.title}
      />
      <time
        dateTime={post.publishedAt}
        className="pt-1 text-sm text-ink-faint tabular-nums transition-colors duration-[var(--dur-short)] group-hover:text-seal/80 sm:pt-1.5"
      >
        {date}
      </time>
      <div className="pointer-events-none relative z-10">
        <Link
          href={`/@${handle}/${post.slug}`}
          transitionTypes={["nav-forward"]}
          className="pointer-events-auto block"
          aria-label={post.title}
        >
          <h2 className="font-serif text-2xl font-medium leading-snug tracking-tight text-ink transition-all duration-[var(--dur-short)] group-hover:translate-x-1 group-hover:text-seal">
            {highlight ? (
              <HighlightText text={post.title} query={highlight} />
            ) : (
              post.title
            )}
          </h2>
        </Link>
        {post.excerpt ? (
          <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-ink-muted line-clamp-2">
            {highlight ? (
              <HighlightText text={post.excerpt} query={highlight} />
            ) : (
              post.excerpt
            )}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
          <Link
            href={`/@${handle}`}
            transitionTypes={["nav-forward"]}
            className="link-underline pointer-events-auto font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {authorName || `@${handle}`}
          </Link>
          {post.agent ? (
            <span className="rounded-full border border-seal/40 px-2 py-0.5 text-xs font-medium text-seal">
              Agent
            </span>
          ) : null}
          {post.aiSummary ? (
            <span
              title="已生成 AI 总结，可在文章页查看"
              className="inline-flex items-center gap-1 rounded-full border border-seal/40 bg-seal/10 px-2 py-0.5 text-xs font-medium text-seal transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:border-seal/60 group-hover:bg-seal/15"
            >
              <SparkleGlyph />
              AI 总结
            </span>
          ) : null}
        </div>
        {post.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-faint">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/tag/${encodeURIComponent(t)}`}
                transitionTypes={["nav-forward"]}
                className="pointer-events-auto transition-colors hover:text-seal"
              >
                {highlight ? (
                  <HighlightText
                    text={`#${t}`}
                    query={highlight}
                    className="rounded-[3px] bg-seal-wash px-0.5 text-inherit"
                  />
                ) : (
                  `#${t}`
                )}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-2 font-serif text-xl text-seal opacity-0 transition-[transform,opacity] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:opacity-100 md:block"
      >
        →
      </span>
    </article>
  );
}
