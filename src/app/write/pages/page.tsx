import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { EmptyState } from "@/components/empty-state";
import { Files } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function WritePagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  if (!store) notFound();
  const pages = await store.listPages(handle);

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 rise">
      <header className="mb-10 flex items-end justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
          Pages
        </h1>
        <Link href="/write/pages/new" className="btn-primary px-4 py-1.5">
          New page
        </Link>
      </header>
      {pages.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Files size={20} weight="duotone" />}
          title="No pages yet."
          hint="Create an about page, a colophon, or anything standalone."
        />
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {pages.map((page) => (
            <div key={page.slug} className="py-5">
              <div className="flex items-center gap-3">
                <Link
                  href={`/write/pages/${page.slug}`}
                  className="link-underline font-serif text-2xl font-medium text-ink transition-colors hover:text-ink"
                >
                  {page.title}
                </Link>
                {page.showInNav ? (
                  <span className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                    In nav
                  </span>
                ) : null}
              </div>
              {page.description ? (
                <p className="mt-1 text-sm text-ink-muted">{page.description}</p>
              ) : null}
              <div className="mt-2 flex items-center gap-4 text-sm">
                <Link
                  href={`/write/pages/${page.slug}`}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <Link
                  href={`/@${handle}/p/${page.slug}`}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
