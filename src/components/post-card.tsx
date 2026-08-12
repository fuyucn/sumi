import Link from "next/link";
import type { PostMeta } from "@/content/types";
import { HighlightText } from "@/components/highlight-text";
import { Eye } from "@phosphor-icons/react/dist/ssr";

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
    <article className="group relative grid grid-cols-[auto_1fr] items-baseline gap-x-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:gap-x-6">
      <Link
        href={`/@${handle}/${post.slug}`}
        transitionTypes={["nav-forward"]}
        className="absolute inset-0 z-0"
        aria-label={post.title}
      />
      <time
        dateTime={post.publishedAt}
        className="essay-num pt-0.5 transition-colors duration-[var(--dur-short)] group-hover:text-seal/80"
      >
        {date}
      </time>
      <div className="pointer-events-none relative z-10 min-w-0">
        <Link
          href={`/@${handle}/${post.slug}`}
          transitionTypes={["nav-forward"]}
          className="pointer-events-auto block"
          aria-label={post.title}
        >
          <h2 className="essay-title">
            {highlight ? (
              <HighlightText text={post.title} query={highlight} />
            ) : (
              post.title
            )}
          </h2>
        </Link>
        <div className="essay-meta mt-2">
          {post.agent ? (
            <span
              className="agent-chip"
              title="由 autonomous agent 协作写作"
            >
              <span className="dot" aria-hidden />
              Agent
            </span>
          ) : null}
          {post.aiSummary ? (
            <span
              className="ai-chip"
              title="已生成 AI 导读，可在文章页查看"
            >
              ✦ AI 导读
            </span>
          ) : null}
          <Link
            href={`/@${handle}`}
            transitionTypes={["nav-forward"]}
            className="link-underline pointer-events-auto font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {authorName || `@${handle}`}
          </Link>
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/tag/${encodeURIComponent(t)}`}
              transitionTypes={["nav-forward"]}
              className="pointer-events-auto"
            >
              <span className="tag-chip">
                {highlight ? (
                  <HighlightText
                    text={t}
                    query={highlight}
                    className="rounded-[3px] bg-seal-wash px-0.5 text-inherit"
                  />
                ) : (
                  t
                )}
              </span>
            </Link>
          ))}
          {typeof post.views === "number" ? (
            <span className="inline-flex items-center gap-1 tabular-nums text-ink-faint">
              <Eye size={13} weight="duotone" aria-hidden />
              {post.views.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>
        {highlight && post.excerpt ? (
          <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-ink-muted line-clamp-1 transition-colors duration-[var(--dur-long)] ease-[var(--ease-out)] group-hover:text-ink-soft">
            <HighlightText text={post.excerpt} query={highlight} />
          </p>
        ) : null}
      </div>
      <span
        aria-hidden
        className="essay-arrow hidden sm:grid"
      >
        →
      </span>
    </article>
  );
}
