/* Hero mascot imagery (public/mascot) has no Cloudflare-safe optimizer;
   plain <img> is intentional here. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getReadContentStore } from "@/content";
import { listFeed } from "@/content/feed";
import { PostCard } from "@/components/post-card";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { ScrollHero } from "@/components/scroll-hero";
import { getCurrentUser } from "@/lib/current-user";
import { getDisplayNameMap } from "@/lib/display-name";
import { Feather } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

/** Staggered word reveal for the hero headline. Pure CSS animation, so the
 * server and first client render are identical (no hydration risk); reduced
 * motion falls back to static text via the media gate in globals.css. */
function HeroHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="hero-word" style={{ animationDelay: `${i * 0.05}s` }}>
            {word}
          </span>{" "}
        </span>
      ))}
    </>
  );
}

export default async function Home() {
  const feed = await listFeed();
  const store = await getReadContentStore();
  const user = await getCurrentUser();
  const names = await getDisplayNameMap(feed.map(({ handle }) => handle));
  const tags = (await store?.listTags()) ?? [];
  const creators = new Set(feed.map(({ handle }) => handle)).size;
  const totalTags = tags.reduce((sum, t) => sum + t.count, 0);
  const featured = feed[0];
  const featuredDate = featured?.post.publishedAt
    ? new Date(featured.post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  // The spotlight deck already points at feed[0]; the list below shows the rest.
  const recent = featured ? feed.slice(1, 7) : feed.slice(0, 6);
  const nowWriting = featured?.post.title ?? "your first essay";

  return (
    <PageTransition>
      <main className="mx-auto max-w-6xl px-5 pt-12 pb-24 sm:px-8">
        <ScrollHero>
          <div aria-hidden className="hero-mascot">
            <img
              src="/mascot/sumi-mascot-v1.webp"
              alt=""
              aria-hidden
              draggable={false}
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="relative z-10 max-w-[46rem]">
            <span className="eyebrow rise">
              <span aria-hidden className="dot" />
              Personal space · est. 2026
            </span>
            <h1 className="mt-7 font-serif text-[clamp(3rem,7.4vw,5.6rem)] font-normal leading-[0.98] tracking-[-0.025em] text-ink text-balance">
              <HeroHeadline text="A quiet place" />
              <br />
              to <em className="hero-accent">write</em>
              <span aria-hidden className="seal-in text-seal">
                .
              </span>
            </h1>
            <p className="hero-sub rise rise-delay-1 mt-7">
              Your words, inked onto warm paper and kept in your own quiet
              corner of the web. No feeds, no noise, just the things you chose
              to keep.
            </p>
            <div className="hero-cta rise rise-delay-2 mt-9">
              <Link
                href={user ? "/write" : "/posts"}
                transitionTypes={["nav-forward"]}
                className="btn-primary group px-6 py-3"
              >
                {user ? "Start writing" : "Read the latest"}
                <ArrowRight
                  size={16}
                  weight="duotone"
                  aria-hidden
                  className="transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/posts"
                transitionTypes={["nav-forward"]}
                className="btn-ghost group px-6 py-3"
              >
                Read the archive
              </Link>
            </div>
          </div>
        </ScrollHero>

        {/* Spotlight: featured essay, archive totals, now */}
        <section className="mt-16 lg:mt-24">
          <Reveal as="div" className="spot-deck">
            {featured ? (
              <Link
                href={`/@${featured.handle}/${featured.post.slug}`}
                transitionTypes={["nav-forward"]}
                className="group block"
              >
                <span className="deck-label">Featured ink</span>
                <h2 className="deck-title">{featured.post.title}</h2>
                <div className="deck-meta">
                  <span>{names.get(featured.handle) ?? `@${featured.handle}`}</span>
                  {featuredDate ? (
                    <>
                      <i aria-hidden />
                      <span>{featuredDate}</span>
                    </>
                  ) : null}
                  {typeof featured.post.views === "number" ? (
                    <>
                      <i aria-hidden />
                      <span>
                        {featured.post.views.toLocaleString("en-US")} views
                      </span>
                    </>
                  ) : null}
                </div>
              </Link>
            ) : (
              <div>
                <span className="deck-label">Featured ink</span>
                <h2 className="deck-title">Nothing published yet.</h2>
                <div className="deck-meta">
                  <span>The first page is always blank.</span>
                </div>
              </div>
            )}

            <div>
              <span className="deck-label">The archive, so far</span>
              <div className="stat-row">
                <span className="k">Essays inked</span>
                <span className="stat-num">{feed.length}</span>
              </div>
              <div className="stat-row">
                <span className="k">Tags shelved</span>
                <span className="stat-num">{totalTags}</span>
              </div>
              <div className="stat-row">
                <span className="k">Authors</span>
                <span className="stat-num">{creators}</span>
              </div>
            </div>

            <div>
              <span className="deck-label">Now · 墨墨</span>
              <div className="now-list">
                <div className="now-row">
                  <span className="k">Writing</span>
                  <span className="v">{nowWriting}</span>
                </div>
                <div className="now-row">
                  <span className="k">Reading</span>
                  <span className="v">
                    {feed.length} {feed.length === 1 ? "essay" : "essays"} kept
                  </span>
                </div>
                <div className="now-row">
                  <span className="k">Keeping</span>
                  <span className="v">{totalTags} tags filed</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Latest ink */}
        <section className="mt-20 lg:mt-28">
          <Reveal as="div" className="sec-head">
            <div>
              <span className="eyebrow">
                <span aria-hidden className="dot" />
                The archive
              </span>
              <h2>
                Latest <em>ink</em>
              </h2>
            </div>
            <Link
              href="/posts"
              transitionTypes={["nav-forward"]}
              className="sec-link group/link"
            >
              View all essays
              <ArrowRight size={13} weight="duotone" aria-hidden />
            </Link>
          </Reveal>

          {feed.length === 0 ? (
            <EmptyState
              className="mt-10"
              icon={<Feather size={20} weight="duotone" />}
              title="Nothing published yet."
              hint="The first page is always blank. Be the one to fill it."
            />
          ) : recent.length > 0 ? (
            <div className="divide-y divide-line">
              {recent.map(({ handle, post }, i) => (
                <Reveal
                  key={`${handle}/${post.slug}`}
                  delay={Math.min(i * 0.05, 0.3)}
                >
                  <PostCard
                    handle={handle}
                    post={post}
                    authorName={names.get(handle)}
                  />
                </Reveal>
              ))}
            </div>
          ) : null}
        </section>

        {/* Tag library */}
        {tags.length > 0 ? (
          <Reveal as="section" className="mt-20">
            <div className="sec-head">
              <div>
                <span className="eyebrow">
                  <span aria-hidden className="dot" />
                  Topics
                </span>
                <h2>
                  Tag <em>library</em>
                </h2>
              </div>
              <Link
                href="/tags"
                transitionTypes={["nav-forward"]}
                className="sec-link group/link"
              >
                All tags
                <ArrowRight size={13} weight="duotone" aria-hidden />
              </Link>
            </div>
            <div className="tags-deck max-w-4xl">
              {tags.map((tag) => (
                <Link
                  key={tag.name}
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  transitionTypes={["nav-forward"]}
                  className="tag"
                >
                  <span>{tag.name}</span>
                  <small>{tag.count}</small>
                </Link>
              ))}
            </div>
          </Reveal>
        ) : null}

        <Reveal as="section" className="manifesto">
          <div>
            <div aria-hidden className="seal-block">
              墨
            </div>
            <h2>
              One quiet space,
              <br />
              owned end to end.
            </h2>
            <p>
              Sumi is a full-stack personal space where{" "}
              <b>content is data</b>: essays, notes and marginalia live in
              Postgres, render as pages, and stay yours. Sign in with GitHub,
              write in your own editor, deploy on Cloudflare or your own VPS.
              Agents can collaborate, leave notifications, and never own the
              voice you publish under.
            </p>
          </div>
          <div>
            <ul className="stack-list">
              <li>
                <b>Next.js 16</b>
                <span>App Router, RSC, Turbopack</span>
                <ArrowRight size={15} weight="duotone" aria-hidden />
              </li>
              <li>
                <b>Postgres</b>
                <span>Drizzle ORM, one source of truth</span>
                <ArrowRight size={15} weight="duotone" aria-hidden />
              </li>
              <li>
                <b>GitHub sign-in</b>
                <span>Display name, not handle</span>
                <ArrowRight size={15} weight="duotone" aria-hidden />
              </li>
              <li>
                <b>Cloudflare / VPS</b>
                <span>Docker or Workers, your choice</span>
                <ArrowRight size={15} weight="duotone" aria-hidden />
              </li>
              <li>
                <b>Remote MCP</b>
                <span>Agents write, you approve</span>
                <ArrowRight size={15} weight="duotone" aria-hidden />
              </li>
            </ul>
          </div>
        </Reveal>
      </main>
    </PageTransition>
  );
}
