import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser, getReadContentStore } from "@/content";
import { estimateReadingTime } from "@/lib/reading-time";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import type { Comment, PostMeta } from "@/content/types";
import {
  ChatCircleDots,
  Eye,
  Feather,
  Stack,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

interface DashboardPost {
  handle: string;
  post: PostMeta;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-paper-raised p-5 shadow-sm">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {value.toLocaleString("en-US")}
      </dd>
    </div>
  );
}

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [handle, store, readStore] = await Promise.all([
    getUserHandle(user.id),
    getContentStoreForUser(user.id),
    getReadContentStore(),
  ]);

  if (!handle || !store) {
    return (
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Stats</h1>
        <p className="mt-4 text-sm text-ink-muted">
          No content backend is configured for writing.
        </p>
      </main>
    );
  }

  const own = (await store.listPosts({ handle })).map(
    (post): DashboardPost => ({ handle, post }),
  );
  const agents = readStore
    ? await db
        .select({ handle: agentKeys.agentHandle })
        .from(agentKeys)
    : [];
  const agentPosts: DashboardPost[] = [];
  if (readStore) {
    for (const agent of agents) {
      for (const post of await readStore.listPosts({ handle: agent.handle })) {
        agentPosts.push({ handle: agent.handle, post });
      }
    }
  }
  const all = [...own, ...agentPosts];
  const published = all.filter((d) => d.post.status === "published");
  const drafts = all.filter((d) => d.post.status === "draft");
  const totalViews = all.reduce((sum, d) => sum + (d.post.views ?? 0), 0);

  // Word count across published posts (needs full bodies).
  let totalWords = 0;
  const bodies = await Promise.all(
    published.map((d) =>
      (d.handle === handle ? store : readStore)?.getPost(d.handle, d.post.slug),
    ),
  );
  for (const body of bodies) {
    if (body) totalWords += estimateReadingTime(body.body).words;
  }

  // Comments across all posts, newest first.
  const commentRows: {
    comment: Comment;
    title: string;
    href: string;
  }[] = [];
  for (const d of all) {
    const list = await (d.handle === handle ? store : readStore)?.listComments(
      d.handle,
      d.post.slug,
    );
    for (const comment of list ?? []) {
      commentRows.push({
        comment,
        title: d.post.title,
        href: `/@${d.handle}/${d.post.slug}`,
      });
    }
  }
  commentRows.sort((a, b) => b.comment.date.localeCompare(a.comment.date));

  // Last 30 days of publish activity (published date, falling back to created).
  const dayKey = (iso?: string) => (iso ? iso.slice(0, 10) : "");
  const counts = new Map<string, number>();
  for (const d of all) {
    const key = dayKey(d.post.status === "draft" ? d.post.createdAt : d.post.publishedAt);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = new Date();
  const days: { key: string; count: number; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: counts.get(key) ?? 0, label: String(d.getDate()) });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const top = published
    .filter((d) => (d.post.views ?? 0) > 0)
    .sort((a, b) => (b.post.views ?? 0) - (a.post.views ?? 0))
    .slice(0, 5);

  return (
    <main className="max-w-4xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">Writing</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          Stats
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          A quiet look at everything you&apos;ve written — ink, reads, and echoes.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Published" value={published.length} icon={<Feather size={12} weight="duotone" aria-hidden />} />
        <StatTile label="Drafts" value={drafts.length} icon={<Feather size={12} weight="duotone" aria-hidden />} />
        <StatTile label="Views" value={totalViews} icon={<Eye size={12} weight="duotone" aria-hidden />} />
        <StatTile label="Words" value={totalWords} icon={<Stack size={12} weight="duotone" aria-hidden />} />
        <StatTile label="Comments" value={commentRows.length} icon={<ChatCircleDots size={12} weight="duotone" aria-hidden />} />
      </dl>

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="border-b border-line pb-4 font-serif text-2xl font-semibold tracking-tight text-ink">
            Last 30 days
          </h2>
          <div className="mt-6 flex h-36 items-end gap-1">
            {days.map((d, i) => (
              <div
                key={d.key}
                className="group relative flex flex-1 flex-col items-center justify-end"
                title={`${d.key}: ${d.count} ${d.count === 1 ? "post" : "posts"}`}
              >
                <span className="pointer-events-none absolute -top-7 hidden rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-paper group-hover:block">
                  {d.count}
                </span>
                <div
                  className={`w-full rounded-t-sm transition-colors duration-[var(--dur-short)] ${
                    d.count > 0
                      ? "bg-seal group-hover:bg-seal-soft"
                      : "bg-ink/[0.06]"
                  }`}
                  style={{ height: `${Math.max(d.count ? 5 : 3, (d.count / maxDay) * 120)}px` }}
                />
                {i % 5 === 4 || i === 29 ? (
                  <span className="mt-1.5 text-[10px] tabular-nums text-ink-faint">
                    {d.label}
                  </span>
                ) : (
                  <span className="mt-1.5 h-[15px]" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="border-b border-line pb-4 font-serif text-2xl font-semibold tracking-tight text-ink">
            Most read
          </h2>
          {top.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">
              Views will collect here as readers open your posts.
            </p>
          ) : (
            <ol className="divide-y divide-line">
              {top.map((d, i) => (
                <li key={`${d.handle}/${d.post.slug}`}>
                  <Link
                    href={`/@${d.handle}/${d.post.slug}`}
                    className="group grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-3 py-3.5"
                  >
                    <span className="font-serif text-lg font-medium text-ink-faint transition-colors duration-[var(--dur-short)] group-hover:text-seal">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-serif text-base font-medium leading-snug tracking-tight text-ink transition-colors duration-[var(--dur-short)] group-hover:text-seal">
                      {d.post.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-ink-faint tabular-nums">
                      <Eye size={12} weight="duotone" aria-hidden />
                      {d.post.views}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-b border-line pb-4 font-serif text-2xl font-semibold tracking-tight text-ink">
          Recent comments
        </h2>
        {commentRows.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            No comments yet — readers will leave their first note soon.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {commentRows.slice(0, 6).map((row) => (
              <li key={row.comment.id} className="py-4">
                <Link
                  href={`${row.href}#comment-${row.comment.id}`}
                  className="group block"
                >
                  <p className="font-serif text-base font-medium leading-snug text-ink transition-colors duration-[var(--dur-short)] group-hover:text-seal">
                    {row.comment.body}
                  </p>
                  <p className="mt-1 text-sm text-ink-faint">
                    {row.comment.handle} · on {row.title} · {formatDate(row.comment.date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
