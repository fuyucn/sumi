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
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Edit post</h1>
      <PostForm initial={{ title: post.title, tags: post.tags.join(", "), body: post.body, publishedAt: post.publishedAt }} />
    </main>
  );
}
