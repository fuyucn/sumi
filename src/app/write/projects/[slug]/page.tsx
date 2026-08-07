import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { ProjectForm } from "@/components/project-form";

export const dynamic = "force-dynamic";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  if (!store) notFound();

  const existing = slug !== "new" ? await store.getProject(handle, slug) : null;
  if (slug !== "new" && !existing) notFound();

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 rise">
      <h1 className="mb-8 font-serif text-3xl font-semibold tracking-tight text-ink">
        {existing ? "Edit project" : "New project"}
      </h1>
      <ProjectForm initial={existing ?? undefined} />
    </main>
  );
}
