import Link from "next/link";
import { getReadContentStore } from "@/content";
import { Reveal } from "@/components/reveal";

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
        {magazines.map((mag, i) => (
          <Reveal key={mag.slug} delay={Math.min(i * 0.05, 0.3)}>
            <div className="group relative -mx-3 px-3 py-4">
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 scale-y-0 rounded-full bg-seal transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:scale-y-100"
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/@${handle}/m/${mag.slug}`}
                    transitionTypes={["nav-forward"]}
                    className="link-underline font-serif text-xl font-medium text-ink transition-colors group-hover:text-seal"
                  >
                    {mag.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink-faint">
                    {(mag.items?.length ?? 0) === 1 ? "1 item" : `${mag.items?.length ?? 0} items`}
                    {mag.description ? ` · ${mag.description}` : ""}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none mt-1 shrink-0 translate-x-1 font-serif text-lg text-seal opacity-0 transition-[transform,opacity] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:opacity-100"
                >
                  →
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
