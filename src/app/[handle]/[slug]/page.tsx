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
    <main className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-serif text-3xl font-semibold leading-tight">{post.title}</h1>
      <p className="mt-3 text-sm text-stone-500">
        <a href={`/@${data.handle}`} className="hover:text-stone-900 transition-colors">
          @{data.handle}
        </a>
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>
      <article className="prose prose-stone max-w-none mt-8">
        <Markdown>{post.body}</Markdown>
      </article>
    </main>
  );
}
