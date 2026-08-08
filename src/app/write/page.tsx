import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser, getReadContentStore } from "@/content";
import { PostRowActions } from "@/components/post-row-actions";
import { WriteTabs } from "@/components/write-tabs";
import { db } from "@/lib/db";
import { agentKeys } from "@/db/schema";
import type { PostMeta } from "@/content/types";

export const dynamic = "force-dynamic";

type Scope = "all" | "mine" | "agent";

interface ListingPost extends PostMeta {
  handle: string;
  isAgent: boolean;
  displayName?: string;
}

function sortTime(p: ListingPost): string {
  return p.createdAt ?? p.publishedAt ?? "";
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

async function loadAgentPosts(): Promise<ListingPost[]> {
  const readStore = await getReadContentStore();
  if (!readStore) return [];
  const agents = await db
    .select({ handle: agentKeys.agentHandle, displayName: agentKeys.displayName })
    .from(agentKeys);
  const out: ListingPost[] = [];
  for (const agent of agents) {
    const posts = await readStore.listPosts({ handle: agent.handle });
    for (const p of posts) {
      out.push({ ...p, handle: agent.handle, displayName: agent.displayName, isAgent: true });
    }
  }
  return out;
}

function PostRow({ post }: { post: ListingPost }) {
  const isDraft = post.status === "draft";
  const date = formatDate(isDraft ? post.createdAt : post.publishedAt);
  return (
    <li className="group border-t border-line first:border-t-0">
      <div className="flex items-center justify-between gap-4 py-4">
        <Link
          href={`/write/${post.slug}${post.isAgent ? `?agent=${encodeURIComponent(post.handle)}` : ""}`}
          className="min-w-0 flex-1 font-serif text-lg leading-snug text-ink transition-colors group-hover:text-seal"
        >
          {post.title || "Untitled"}
          {post.isAgent ? (
            <span className="ml-2 inline-block rounded-full border border-seal/40 px-2 py-0.5 align-middle text-xs font-medium tracking-wide text-seal">
              Agent
            </span>
          ) : null}
          <span className="mt-0.5 block text-sm font-sans text-ink-faint">
            {post.isAgent && post.displayName ? `${post.displayName} · @${post.handle} · ` : ""}
            {date ? `${date} · ` : ""}
            {post.tags.length ? "#" + post.tags.join("  #") : "Untagged"}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isDraft ? "bg-ink/[0.06] text-ink-soft" : "bg-seal/[0.1] text-seal"
            }`}
          >
            {isDraft ? "Draft" : "Published"}
          </span>
          <PostRowActions
            handle={post.handle}
            slug={post.slug}
            status={post.status}
            isAgent={post.isAgent}
          />
        </div>
      </div>
    </li>
  );
}

export default async function WriteDashboard({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const sp = await searchParams;
  const rawScope = typeof sp.scope === "string" ? sp.scope : "all";
  const scope: Scope = rawScope === "mine" || rawScope === "agent" ? rawScope : "all";
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);
  const agentPosts = await loadAgentPosts();

  if (!handle || !store) {
    return (
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Your posts</h1>
        <p className="mt-4 text-sm text-ink-muted">
          No content backend is configured for writing.
        </p>
      </main>
    );
  }

  const ownPosts = (await store.listPosts({ handle })).map(
    (p): ListingPost => ({ ...p, handle, isAgent: false }),
  );
  const all = [...ownPosts, ...agentPosts].sort((a, b) =>
    sortTime(b).localeCompare(sortTime(a)),
  );
  const mine = all.filter((p) => !p.isAgent);
  const agent = all.filter((p) => p.isAgent);
  const visible =
    scope === "mine" ? mine : scope === "agent" ? agent : all;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">Writing</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">Your posts</h1>
        </div>
        <Link
          href="/write/new"
          className="btn-primary shrink-0 px-5"
        >
          + New post
        </Link>
      </header>

      <WriteTabs
        tabs={[
          { href: "/write", active: scope === "all", label: `All · ${all.length}` },
          { href: "/write?scope=mine", active: scope === "mine", label: `Mine · ${mine.length}` },
          { href: "/write?scope=agent", active: scope === "agent", label: `Agent · ${agent.length}` },
        ]}
      />

      {visible.length === 0 ? (
        <div className="border-t border-line py-24 text-center">
          <p className="font-serif text-lg text-ink-muted">Nothing here yet.</p>
          <p className="mt-2 text-sm text-ink-faint">
            {scope === "agent"
              ? "Agent hasn't written any posts yet."
              : scope === "mine"
                ? "Start your first post. It autosaves to your browser as you type."
                : "Start your first post. It autosaves to your browser as you type."}
          </p>
        </div>
      ) : (
        <ul>
          {visible.map((p) => (
            <PostRow key={`${p.handle}/${p.slug}`} post={p} />
          ))}
        </ul>
      )}

      <section className="mt-12">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-ink-faint">
          Collections
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/write/magazines"
            className="card group flex items-center justify-between"
          >
            <span className="font-serif text-lg font-medium text-ink">Magazines</span>
            <span className="text-sm text-ink-faint transition-colors group-hover:text-seal">→</span>
          </Link>
          <Link
            href="/write/projects"
            className="card group flex items-center justify-between"
          >
            <span className="font-serif text-lg font-medium text-ink">Projects</span>
            <span className="text-sm text-ink-faint transition-colors group-hover:text-seal">→</span>
          </Link>
          <Link
            href="/write/pages"
            className="card group flex items-center justify-between"
          >
            <span className="font-serif text-lg font-medium text-ink">Pages</span>
            <span className="text-sm text-ink-faint transition-colors group-hover:text-seal">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
