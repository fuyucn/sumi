import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAiStore, getReadContentStore } from "@/content";
import { Markdown } from "@/components/markdown";
import { Comments } from "@/components/comments";
import { LikeButton } from "@/components/like-button";
import { AiSummaryPanel } from "@/components/ai-summary-panel";
import { ReadingProgress } from "@/components/reading-progress";
import { PageTransition } from "@/components/page-transition";
import { TrackView } from "@/components/track-view";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { estimateReadingTime } from "@/lib/reading-time";
import { extractHeadings } from "@/lib/heading-slug";
import { displayName, getDisplayNameMap } from "@/lib/display-name";
import { relatedFromStore } from "@/content/related";
import { Reveal } from "@/components/reveal";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Clock } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

function RelatedInk({
  items,
  byTag,
  names,
}: {
  items: { handle: string; post: import("@/content/types").PostMeta }[];
  byTag: boolean;
  names: Map<string, string>;
}) {
  if (items.length === 0) return null;
  return (
    <Reveal as="section" className="mt-16">
      <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
            {byTag ? "Related ink" : "More ink"}
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            {byTag
              ? "Keeps wandering in the same neighbourhood."
              : "From the same quiet shelves."}
          </p>
        </div>
        <Link
          href="/posts"
          transitionTypes={["nav-forward"]}
          className="group/link link-underline inline-flex items-center gap-1 text-sm text-ink-faint transition-colors hover:text-ink-muted"
        >
          All posts
          <ArrowRight
            size={13}
            weight="duotone"
            aria-hidden
            className="transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover/link:translate-x-0.5"
          />
        </Link>
      </div>
      <div className="grid gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ handle, post }) => {
          const date = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : null;
          return (
            <Link
              key={`${handle}/${post.slug}`}
              href={`/@${handle}/${post.slug}`}
              transitionTypes={["nav-forward"]}
              className="group flex h-full flex-col justify-between rounded-card border border-line bg-paper-raised p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-[var(--dur-short)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-seal/40 hover:shadow-card"
            >
              <h3 className="font-serif text-lg font-medium leading-snug tracking-tight text-ink transition-colors duration-[var(--dur-short)] group-hover:text-seal">
                {post.title}
              </h3>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                {post.excerpt}
              </p>
              <p className="mt-4 text-sm text-ink-faint">
                {[names.get(handle), date].filter(Boolean).join(" · ")}
              </p>
            </Link>
          );
        })}
      </div>
    </Reveal>
  );
}

async function load(handleRaw: string, slugRaw: string) {
  // Next delivers params URL-encoded (e.g. "%40fuyucn"); decode before use.
  const handleParam = decodeURIComponent(handleRaw);
  if (!handleParam.startsWith("@")) return null;
  const store = await getReadContentStore();
  if (!store) return null;
  const handle = handleParam.slice(1);
  const post = await store.getPost(handle, decodeURIComponent(slugRaw));
  if (!post || post.status !== "published") return null;
  const authorName = displayName(handle, await store.getProfile(handle));
  return { handle, post, store, authorName };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; slug: string }> }): Promise<Metadata> {
  const { handle, slug } = await params;
  const data = await load(handle, slug);
  if (!data) return {};
  return { title: data.post.title, description: data.post.excerpt };
}

export default async function ArticlePage({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const data = await load(handle, slug);
  if (!data) notFound();
  const { post } = data;
  const decodedSlug = decodeURIComponent(slug);
  const { items: related, byTag } = await relatedFromStore(
    data.store,
    data.handle,
    decodedSlug,
    post.tags,
  );
  const relatedNames = await getDisplayNameMap(
    related.map((r) => r.handle),
  );
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;
  const likers = await data.store.listLikes(data.handle, decodedSlug);
  const reading = estimateReadingTime(post.body);
  const aiStore = await getAiStore();
  const aiTask = aiStore ? await aiStore.getTask(data.handle, decodedSlug) : null;
  const headingInfos = extractHeadings(post.body);
  const headings = headingInfos.map((h) => h.slug);
  const sections = headingInfos.map((h) => ({ id: h.slug, label: h.text }));
  const bodyStart = post.body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}.*$/gm, "")
    .trimStart();
  // 首字下沉只在正文以文字段落开篇时启用；引号、图片、代码或标题开头不适用。
  const dropCap = Boolean(bodyStart) && !/^["“”‘’「」『』（(]/.test(bodyStart);

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-28">
      <ReadingProgress sections={sections} />
      <header>
        <Link
          href="/posts"
          transitionTypes={["nav-back"]}
          className="group/back link-underline text-sm text-ink-faint transition-colors hover:text-ink"
        >
          <span
            aria-hidden
            className="inline-block transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover/back:-translate-x-0.5"
          >
            ←
          </span>{" "}
          Back to posts
        </Link>
        <h1 className="mt-4 font-serif text-[2rem] sm:text-[2.5rem] leading-[1.12] font-semibold tracking-tight text-ink text-balance">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-ink-faint">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Link
            href={`/@${data.handle}`}
              transitionTypes={["nav-forward"]}
              className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {data.authorName}
            </Link>
            {post.agent ? (
              <span
                aria-hidden
                className="rounded-full border border-seal/40 px-2 py-0.5 text-xs font-medium tracking-wide text-seal"
              >
                Agent
              </span>
            ) : null}
            {post.publishedAt ? (
              <>
                <span aria-hidden className="text-line-strong">·</span>
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft tabular-nums">
            <Clock size={12} weight="duotone" aria-hidden />
            {reading.minutes} min read · {reading.words.toLocaleString("en-US")}{" "}
            {reading.words === 1 ? "word" : "words"}
            {" · "}
            <TrackView
              handle={data.handle}
              slug={decodedSlug}
              initialViews={post.views}
            />
          </span>
        </div>
      </header>
      {post.coverImage ? (
        <img
          src={post.coverImage}
          alt={post.title}
          width={1600}
          height={900}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          className="mt-8 w-full rounded-card border border-line object-cover shadow-card media-fade"
        />
      ) : null}
      <AiSummaryPanel
        handle={data.handle}
        slug={decodedSlug}
        initialTask={aiTask}
        headings={headings}
        isAuthor={signedInHandle === data.handle}
      />
      {/* Section ornament: a small rotated seal diamond between the summary
          and the body, echoing the hanko mark instead of a plain rule. */}
      <div
        aria-hidden
        role="presentation"
        className="mt-9 mb-11 flex items-center gap-3"
      >
        <span className="h-px flex-1 bg-line" />
        <span className="seal-diamond-in h-1.5 w-1.5 rotate-45 rounded-[2px] bg-seal/60" />
        <span className="h-px flex-1 bg-line" />
      </div>
      <article
        className={`prose prose-stone prose-article max-w-none font-serif prose-headings:font-serif${
          dropCap ? " drop-cap" : ""
        }`}
      >
        <Markdown>{post.body}</Markdown>
      </article>
      {post.tags.length > 0 ? (
        <footer className="tag-stagger mt-16 flex flex-wrap items-center gap-3 border-t border-line pt-8 text-sm text-ink-faint">
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/tag/${encodeURIComponent(t)}`}
              transitionTypes={["nav-forward"]}
              className="press rounded-full border border-line-strong px-3 py-1 transition-colors hover:border-seal hover:bg-seal-wash/60 hover:text-seal"
            >
              #{t}
            </Link>
          ))}
        </footer>
      ) : null}
      <div className="mt-8">
        <LikeButton
          postHandle={data.handle}
          slug={decodedSlug}
          initialCount={likers.length}
          initialLiked={signedInHandle !== null && likers.includes(signedInHandle)}
        />
      </div>
      <RelatedInk items={related} byTag={byTag} names={relatedNames} />
      <Comments handle={data.handle} slug={decodedSlug} />
      </main>
    </PageTransition>
  );
}
