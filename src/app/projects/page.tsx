import Link from "next/link";
import { getReadContentStore } from "@/content";
import type { Project } from "@/content/types";
import { ProjectGallery } from "@/components/project-gallery";
import { getDisplayNameMap } from "@/lib/display-name";

export const dynamic = "force-dynamic";

async function loadProjects(): Promise<Array<{ handle: string; project: Project }>> {
  const store = await getReadContentStore();
  if (!store) return [];
  const out: Array<{ handle: string; project: Project }> = [];
  for (const handle of await store.listHandles()) {
    for (const project of await store.listProjects(handle)) {
      out.push({ handle, project });
    }
  }
  out.sort(
    (a, b) =>
      (b.project.featured ? 1 : 0) - (a.project.featured ? 1 : 0) ||
      (a.project.order ?? 99) - (b.project.order ?? 99) ||
      a.project.title.localeCompare(b.project.title),
  );
  return out;
}

function repoUrl(repo: string): string | null {
  if (/^https?:\/\//i.test(repo)) return repo;
  if (repo.includes("/")) return `https://github.com/${repo}`;
  return null;
}

export default async function ProjectsPage() {
  const items = await loadProjects();
  const names = await getDisplayNameMap(items.map(({ handle }) => handle));

  return (
    <main className="max-w-4xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
          Built
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          Projects
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Things built and kept in the open, by the people of this space.
        </p>
      </header>
      {items.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          Nothing on the shelves yet.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map(({ handle, project }) => {
            const href = project.url || repoUrl(project.repo ?? "") || `/@${handle}`;
            const external = href.startsWith("http");
            return (
              <article key={`${handle}/${project.slug}`} className="card group lift flex flex-col overflow-hidden">
                {project.coverImage || (project.gallery && project.gallery.length > 0) ? (
                  <div className="overflow-hidden border-b border-line">
                    <img
                      src={project.coverImage ?? project.gallery![0]}
                      alt={project.title}
                      width={1600}
                      height={900}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="aspect-[16/9] w-full object-cover transition-transform duration-[var(--dur-long)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
                    />
                  </div>
                ) : null}
                <div className="flex grow flex-col p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="min-w-0">
                      <a
                        href={href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noreferrer" : undefined}
                        className="link-underline font-serif text-xl font-semibold tracking-tight text-ink transition-colors hover:text-seal"
                      >
                        {project.title}
                      </a>
                    </h2>
                    {project.featured ? (
                      <span className="shrink-0 rounded-full bg-seal/[0.1] px-2 py-0.5 text-xs font-medium text-seal">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  {project.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {project.description}
                    </p>
                  ) : null}
                  {project.tech && project.tech.length > 0 ? (
                    <p className="mt-3 flex flex-wrap gap-1.5">
                      {project.tech.map((t) => (
                        <span key={t} className="rounded-full bg-paper-soft px-2 py-0.5 text-xs text-ink-faint">
                          #{t}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center gap-3 pt-4 text-sm">
                    <Link
                      href={`/@${handle}`}
                      className="link-underline font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                      {names.get(handle)}
                    </Link>
                    {project.repo && repoUrl(project.repo) ? (
                      <a
                        href={repoUrl(project.repo)!}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-ink-faint transition-colors hover:text-ink-muted"
                      >
                        repo ↗
                      </a>
                    ) : null}
                  </div>
                  {project.gallery && project.gallery.length > 0 ? (
                    <div className="mt-5">
                      <ProjectGallery images={project.gallery} title={project.title} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
