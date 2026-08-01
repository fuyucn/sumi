import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";

export const dynamic = "force-dynamic";

export default async function MagazinesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  if (!store) notFound();
  const magazines = await store.listMagazines(handle);

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 rise">
      <header className="mb-10 flex items-end justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
          Magazines
        </h1>
        <Link
          href="/write/magazines/new"
          className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper hover:bg-ink-soft"
        >
          New magazine
        </Link>
      </header>
      {magazines.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          No magazines yet.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {magazines.map((mag) => (
            <div key={mag.slug} className="py-5">
              <Link
                href={`/@${handle}/m/${mag.slug}`}
                className="link-underline font-serif text-2xl font-medium text-ink transition-colors hover:text-ink"
              >
                {mag.title}
              </Link>
              {mag.description ? (
                <p className="mt-1 text-sm text-ink-muted">{mag.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-ink-faint">
                {(mag.items?.length ?? 0) === 1 ? "1 item" : `${mag.items?.length ?? 0} items`}
              </p>
              <Link
                href={`/write/magazines/${mag.slug}`}
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
