import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReadContentStore } from "@/content";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

async function load(handleRaw: string, slugRaw: string) {
  // Next delivers params URL-encoded (e.g. "%40fuyucn"); decode before use.
  const handleParam = decodeURIComponent(handleRaw);
  if (!handleParam.startsWith("@")) return null;
  const store = getReadContentStore();
  if (!store) return null;
  const handle = handleParam.slice(1);
  const post = await store.getPost(handle, decodeURIComponent(slugRaw));
  if (!post || post.status !== "published") return null;
  return { handle, post };
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
  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-28 rise">
      <header>
        <h1 className="font-serif text-[2rem] sm:text-[2.5rem] leading-[1.12] font-semibold tracking-tight text-ink text-balance">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
          <a
            href={`/@${data.handle}`}
            className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
          >
            @{data.handle}
          </a>
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
      </header>
      <hr className="mt-8 mb-10 border-line" />
      <article className="prose prose-stone max-w-none font-serif prose-headings:font-serif">
        <Markdown>{post.body}</Markdown>
      </article>
      {post.tags.length > 0 ? (
        <footer className="mt-16 flex flex-wrap items-center gap-3 border-t border-line pt-8 text-sm text-ink-faint">
          {post.tags.map((t) => (
            <a
              key={t}
              href={`/tag/${encodeURIComponent(t)}`}
              className="rounded-full border border-line-strong px-3 py-1 transition-colors hover:border-seal hover:text-seal"
            >
              #{t}
            </a>
          ))}
        </footer>
      ) : null}
    </main>
  );
}
