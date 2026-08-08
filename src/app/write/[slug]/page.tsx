import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import { getAiStore, getContentStoreForUser } from "@/content";
import { extractHeadings } from "@/lib/heading-slug";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ agent?: string | string[] }>;
}) {
  const { slug: rawSlug } = await params;
  // Next delivers dynamic-segment params URL-encoded (CJK slugs arrive as
  // %E9%AA%8C...); decode before matching against stored slugs.
  const slug = decodeURIComponent(rawSlug);
  const sp = await searchParams;
  const agentRaw = typeof sp.agent === "string" ? sp.agent : undefined;
  // Agent drafts live under the agent's handle; `?agent=<handle>` lets the
  // signed-in user open one for in-place editing (author stays the agent).
  const agentSource = agentRaw ? decodeURIComponent(agentRaw) : undefined;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  if (!handle || !store) notFound();
  let post;
  if (agentSource) {
    const rows = await db
      .select({ handle: agentKeys.agentHandle })
      .from(agentKeys)
      .where(eq(agentKeys.agentHandle, agentSource))
      .limit(1);
    if (!rows.length) notFound();
    post = await store.getPost(agentSource, slug);
    if (!post) notFound();
  } else {
    post = await store.getPost(handle, slug);
    if (!post) notFound();
  }
  const aiStore = await getAiStore();
  const taskHandle = agentSource ?? handle;
  const aiTask = aiStore ? await aiStore.getTask(taskHandle, slug) : null;
  // Keep agent-edit autosave/local-state separate from the user's own draft of
  // the same slug, and remount the form when switching between the two.
  const draftKey = agentSource ? `${agentSource}/${slug}` : slug;
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <PostForm
        key={draftKey}
        draftKey={draftKey}
        postSlug={slug}
        agentSource={agentSource}
        initialAgent={post.agent}
        initialAiTask={aiTask}
        aiHeadings={extractHeadings(post.body)}
        initial={{
          title: post.title,
          tags: post.tags.join(", "),
          body: post.body,
          excerpt: post.excerpt ?? "",
          publishedAt: post.publishedAt,
        }}
      />
    </main>
  );
}
