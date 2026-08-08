import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAiStore, getReadContentStore } from "@/content";
import { Markdown } from "@/components/markdown";
import { Comments } from "@/components/comments";
import { LikeButton } from "@/components/like-button";
import { AiSummaryPanel } from "@/components/ai-summary-panel";
import { ReadingProgress } from "@/components/reading-progress";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { estimateReadingTime } from "@/lib/reading-time";
import { extractHeadings } from "@/lib/heading-slug";
import { displayName } from "@/lib/display-name";
import { Clock } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

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
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;
  const likers = await data.store.listLikes(data.handle, decodedSlug);
  const reading = estimateReadingTime(post.body);
  const aiStore = await getAiStore();
  const aiTask = aiStore ? await aiStore.getTask(data.handle, decodedSlug) : null;
  const headingInfos = extractHeadings(post.body);
  const headings = headingInfos.map((h) => h.slug);
  const sections = headingInfos.map((h) => ({ id: h.slug, label: h.text }));

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-28 rise">
      <ReadingProgress sections={sections} />
      <header>
        <Link
          href="/posts"
          className="group/back link-underline text-sm text-ink-faint transition-colors hover:text-ink"
        >
          <span
            aria-hidden
            className="inline-block transition-transform duration-200 ease-out group-hover/back:-translate-x-0.5"
          >
            ←
          </span>{" "}
          Back to posts
        </Link>
        <h1 className="mt-4 font-serif text-[2rem] sm:text-[2.5rem] leading-[1.12] font-semibold tracking-tight text-ink text-balance">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-faint">
          <a
            href={`/@${data.handle}`}
            className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {data.authorName}
          </a>
          {post.agent ? (
            <>
              <span
                aria-hidden
                className="rounded-full border border-seal/40 px-2 py-0.5 text-xs font-medium tracking-wide text-seal"
              >
                Agent
              </span>
            </>
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
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft"
          >
            <Clock size={12} weight="duotone" aria-hidden />
            {reading.minutes} min read · {reading.words.toLocaleString("en-US")}{" "}
            {reading.words === 1 ? "word" : "words"}
          </span>
        </div>
      </header>
      {post.coverImage ? (
        <img
          src={post.coverImage}
          alt={post.title}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="mt-8 w-full rounded-card border border-line object-cover shadow-card"
        />
      ) : null}
      <AiSummaryPanel
        handle={data.handle}
        slug={decodedSlug}
        initialTask={aiTask}
        headings={headings}
        isAuthor={signedInHandle === data.handle}
      />
      <hr className="mt-8 mb-10 border-line" />
      <article className="prose prose-stone prose-article max-w-none font-serif prose-headings:font-serif">
        <Markdown>{post.body}</Markdown>
      </article>
      {post.tags.length > 0 ? (
        <footer className="mt-16 flex flex-wrap items-center gap-3 border-t border-line pt-8 text-sm text-ink-faint">
          {post.tags.map((t) => (
            <a
              key={t}
              href={`/tag/${encodeURIComponent(t)}`}
              className="press rounded-full border border-line-strong px-3 py-1 transition-colors hover:border-seal hover:text-seal"
            >
              #{t}
            </a>
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
      <Comments handle={data.handle} slug={decodedSlug} />
    </main>
  );
}
