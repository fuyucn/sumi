import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getReadContentStore } from "@/content";
import { Markdown } from "@/components/markdown";
import { displayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

async function load(handleRaw: string, slugRaw: string) {
  const handleParam = decodeURIComponent(handleRaw);
  if (!handleParam.startsWith("@")) return null;
  const store = await getReadContentStore();
  if (!store) return null;
  const handle = handleParam.slice(1);
  const page = await store.getPage(handle, decodeURIComponent(slugRaw));
  if (!page) return null;
  const authorName = displayName(handle, await store.getProfile(handle));
  return { handle, page, authorName };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; slug: string }> }): Promise<Metadata> {
  const { handle, slug } = await params;
  const data = await load(handle, slug);
  if (!data) return {};
  return { title: data.page.title, description: data.page.description };
}

export default async function IndependentPage({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const data = await load(handle, slug);
  if (!data) notFound();
  const { page } = data;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-28 rise">
      <Link
        href={`/@${data.handle}`}
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-seal"
      >
        <span
          aria-hidden
          className="transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:-translate-x-0.5"
        >
          ←
        </span>
        {data.authorName}
      </Link>
      <header className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">Page</p>
        <h1 className="font-serif text-[2rem] sm:text-[2.5rem] leading-[1.12] font-semibold tracking-tight text-ink text-balance">
          {page.title}
        </h1>
        {page.description ? (
          <p className="mt-3 font-serif text-lg leading-relaxed text-ink-muted">
            {page.description}
          </p>
        ) : null}
      </header>
      <article className="mt-8 prose prose-stone max-w-none font-serif prose-headings:font-serif">
        <Markdown>{page.body}</Markdown>
      </article>
    </main>
  );
}
