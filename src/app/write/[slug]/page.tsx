import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  if (!handle || !store) notFound();
  const post = await store.getPost(handle, slug);
  if (!post) notFound();
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <PostForm
        key={slug}
        draftKey={slug}
        initial={{ title: post.title, tags: post.tags.join(", "), body: post.body, publishedAt: post.publishedAt }}
      />
    </main>
  );
}
