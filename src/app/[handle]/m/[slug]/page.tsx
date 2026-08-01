import Link from "next/link";
import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import type { Post } from "@/content/types";

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
  const store = getReadContentStore();
  if (!store) notFound();
  const mag = await store.getMagazine(handle, magSlug);
  if (!mag) notFound();

  const posts = (
    await Promise.all((mag.items ?? []).map((s) => store!.getPost(handle, s)))
  ).filter((p): p is Post => p !== null && p.status === "published");

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <Link
        href={`/@${handle}`}
        className="link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        @{handle}
      </Link>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink">
        {mag.title}
      </h1>
      {mag.description ? (
        <p className="mt-3 font-serif text-lg leading-relaxed text-ink-muted">
          {mag.description}
        </p>
      ) : null}
      {posts.length === 0 ? (
        <p className="mt-16 border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          This magazine is empty.
        </p>
      ) : (
        <ol className="mt-10 divide-y divide-line border-t border-line">
          {posts.map((post, i) => (
            <li key={post.slug} className="py-5">
              <span className="mr-3 text-sm text-ink-faint tabular-nums">{i + 1}.</span>
              <Link
                href={`/@${handle}/${post.slug}`}
                className="link-underline font-serif text-xl font-medium text-ink transition-colors hover:text-ink"
              >
                {post.title}
              </Link>
              {post.publishedAt ? (
                <time
                  dateTime={post.publishedAt}
                  className="mt-1 block text-sm text-ink-faint"
                >
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
