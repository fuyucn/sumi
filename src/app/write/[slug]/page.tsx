import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getAiStore, getContentStoreForUser } from "@/content";
import { extractHeadings } from "@/lib/heading-slug";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  // Next delivers dynamic-segment params URL-encoded (CJK slugs arrive as
  // %E9%AA%8C...); decode before matching against stored slugs.
  const slug = decodeURIComponent(rawSlug);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  if (!handle || !store) notFound();
  const post = await store.getPost(handle, slug);
  if (!post) notFound();
  const aiStore = await getAiStore();
  const aiTask = aiStore ? await aiStore.getTask(handle, slug) : null;
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <PostForm
        key={slug}
        draftKey={slug}
        postSlug={slug}
        initialAiTask={aiTask}
        aiHeadings={extractHeadings(post.body)}
        initial={{ title: post.title, tags: post.tags.join(", "), body: post.body, publishedAt: post.publishedAt }}
      />
    </main>
  );
}
