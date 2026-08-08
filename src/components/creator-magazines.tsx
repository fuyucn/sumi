import Link from "next/link";
import { getReadContentStore } from "@/content";

export async function CreatorMagazines({ handle }: { handle: string }) {
  const store = await getReadContentStore();
  if (!store) return null;
  const magazines = await store.listMagazines(handle);
  if (magazines.length === 0) return null;

  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
        Magazines
      </h2>
      <div className="mt-6 divide-y divide-line">
        {magazines.map((mag) => (
          <div key={mag.slug} className="py-4">
            <Link
              href={`/@${handle}/m/${mag.slug}`}
              transitionTypes={["nav-forward"]}
              className="link-underline font-serif text-xl font-medium text-ink transition-colors hover:text-ink"
            >
              {mag.title}
            </Link>
            <p className="mt-1 text-sm text-ink-faint">
              {(mag.items?.length ?? 0) === 1 ? "1 item" : `${mag.items?.length ?? 0} items`}
              {mag.description ? ` · ${mag.description}` : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
