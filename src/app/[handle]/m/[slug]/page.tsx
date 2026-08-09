import Link from "next/link";
import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import type { Post } from "@/content/types";
import { displayName } from "@/lib/display-name";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function MagazinePage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle: rawHandle, slug: rawSlug } = await params;
  const handleParam = decodeURIComponent(rawHandle);
  if (!handleParam.startsWith("@")) notFound();
  const handle = handleParam.slice(1);
  const magSlug = decodeURIComponent(rawSlug);
  const store = await getReadContentStore();
  if (!store) notFound();
  const mag = await store.getMagazine(handle, magSlug);
  if (!mag) notFound();
  const authorName = displayName(handle, await store.getProfile(handle));

  const posts = (
    await Promise.all((mag.items ?? []).map((s) => store!.getPost(handle, s)))
  ).filter((p): p is Post => p !== null && p.status === "published");

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <Link
        href={`/@${handle}`}
        className="group/back link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <span
          aria-hidden
          className="inline-block transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover/back:-translate-x-0.5"
        >
          ←
        </span>{" "}
        {authorName}
      </Link>
      <header className="mt-6 mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">Magazine</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          {mag.title}
        </h1>
        {mag.description ? (
          <p className="mt-3 font-serif text-lg leading-relaxed text-ink-muted">
            {mag.description}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-ink-muted tabular-nums">
          {posts.length} {posts.length === 1 ? "post" : "posts"} collected.
        </p>
      </header>
      {posts.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<BookOpen size={20} weight="duotone" />}
          title="This magazine is empty."
          hint="Collected posts will line up here."
        />
      ) : (
        <ol className="mt-8 divide-y divide-line border-t border-line">
          {posts.map((post, i) => (
            <Reveal
              as="li"
              key={post.slug}
              delay={Math.min(i * 0.05, 0.3)}
              className="group relative -mx-3 rounded-lg px-3 py-5 transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:bg-paper-soft/60"
            >
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 scale-y-0 rounded-full bg-seal transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:scale-y-100"
              />
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-serif text-sm text-seal tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/@${handle}/${post.slug}`}
                    className="link-underline font-serif text-xl font-medium leading-snug text-ink transition-colors group-hover:text-seal"
                  >
                    {post.title}
                  </Link>
                  {post.publishedAt ? (
                    <time
                      dateTime={post.publishedAt}
                      className="mt-1 block text-sm text-ink-faint tabular-nums"
                    >
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  ) : null}
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none mt-1 shrink-0 translate-x-1 font-serif text-lg text-seal opacity-0 transition-[transform,opacity] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:opacity-100"
                >
                  →
                </span>
              </div>
            </Reveal>
          ))}
        </ol>
      )}
    </main>
  );
}
