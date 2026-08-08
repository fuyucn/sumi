import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { MagazineForm } from "@/components/magazine-form";
import { EditorBackLink } from "@/components/editor-back-link";

export const dynamic = "force-dynamic";

export default async function MagazineEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  if (!store) notFound();

  const existing = slug !== "new" ? await store.getMagazine(handle, slug) : null;
  if (slug !== "new" && !existing) notFound();

  const posts = (await store.listPosts({ handle, status: "published" })).map(
    (p) => ({ slug: p.slug, title: p.title }),
  );

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 rise">
      <EditorBackLink href="/write/magazines" label="Your magazines" />
      <h1 className="mb-8 font-serif text-3xl font-semibold tracking-tight text-ink">
        {existing ? "Edit magazine" : "New magazine"}
      </h1>
      <MagazineForm posts={posts} initial={existing ?? undefined} />
    </main>
  );
}
