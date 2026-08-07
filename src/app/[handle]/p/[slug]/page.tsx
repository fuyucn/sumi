import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getReadContentStore } from "@/content";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

async function load(handleRaw: string, slugRaw: string) {
  const handleParam = decodeURIComponent(handleRaw);
  if (!handleParam.startsWith("@")) return null;
  const store = await getReadContentStore();
  if (!store) return null;
  const handle = handleParam.slice(1);
  const page = await store.getPage(handle, decodeURIComponent(slugRaw));
  if (!page) return null;
  return { handle, page };
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
      <header>
        <h1 className="font-serif text-[2rem] sm:text-[2.5rem] leading-[1.12] font-semibold tracking-tight text-ink text-balance">
          {page.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
          <Link
            href={`/@${data.handle}`}
            className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
          >
            @{data.handle}
          </Link>
          {page.description ? (
            <>
              <span aria-hidden className="text-line-strong">·</span>
              <span>{page.description}</span>
            </>
          ) : null}
        </div>
      </header>
      <article className="prose prose-stone max-w-none font-serif prose-headings:font-serif">
        <Markdown>{page.body}</Markdown>
      </article>
    </main>
  );
}
