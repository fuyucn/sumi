import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";

export const dynamic = "force-dynamic";

export default async function WriteProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  if (!store) notFound();
  const projects = await store.listProjects(handle);

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 rise">
      <header className="mb-10 flex items-end justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
          Projects
        </h1>
        <Link href="/write/projects/new" className="btn-primary px-4 py-1.5">
          New project
        </Link>
      </header>
      {projects.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          No projects yet. Showcase something you built.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {projects.map((project) => (
            <div key={project.slug} className="py-5">
              <div className="flex items-center gap-3">
                <Link
                  href={`/write/projects/${project.slug}`}
                  className="link-underline font-serif text-2xl font-medium text-ink transition-colors hover:text-ink"
                >
                  {project.title}
                </Link>
                {project.featured ? (
                  <span className="rounded-full bg-seal/[0.1] px-2.5 py-0.5 text-xs font-medium text-seal">
                    Featured
                  </span>
                ) : null}
              </div>
              {project.description ? (
                <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
              ) : null}
              {project.tech && project.tech.length > 0 ? (
                <p className="mt-1 text-xs text-ink-faint">
                  {project.tech.map((t) => `#${t}`).join(" ")}
                </p>
              ) : null}
              <Link
                href={`/write/projects/${project.slug}`}
                className="mt-2 inline-block text-sm text-ink-muted transition-colors hover:text-ink"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
