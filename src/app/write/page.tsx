import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import type { PostMeta } from "@/content/types";

export const dynamic = "force-dynamic";

function PostRow({ post, handle, isDraft }: { post: PostMeta; handle: string; isDraft: boolean }) {
  const href = `/@${handle}/${post.slug}`;
  const editHref = `/write/${post.slug}`;
  return (
    <li className="group border-t border-line first:border-t-0">
      <div className="flex items-center justify-between gap-4 py-4">
        <Link
          href={editHref}
          className="min-w-0 flex-1 font-serif text-lg leading-snug text-ink transition-colors group-hover:text-seal"
        >
          {post.title || "Untitled"}
          {post.agent ? (
            <span className="ml-2 inline-block rounded-full border border-seal/40 px-2 py-0.5 align-middle text-xs font-medium tracking-wide text-seal">
              Agent
            </span>
          ) : null}
          <span className="mt-0.5 block text-sm font-sans text-ink-faint">
            {"#" + post.tags.join("  #")}
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
          <Link
            href={editHref}
            className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-soft transition-colors hover:bg-ink/[0.03]"
          >
            Edit
          </Link>
          {!isDraft ? (
            <Link href={href} className="text-sm text-ink-faint transition-colors hover:text-ink-muted">
              View
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default async function WriteDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const [handle, store] = await Promise.all([getUserHandle(user.id), getContentStoreForUser(user.id)]);

  if (!handle || !store) {
    return (
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Your posts</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Content repository is not configured for writing.
        </p>
      </main>
    );
  }

  const posts = await store.listPosts({ handle });
  const drafts = posts.filter((p) => p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-ink-faint">Writing</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-ink">Your posts</h1>
        </div>
        <Link
          href="/write/new"
          className="shrink-0 rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
        >
          + New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="border-t border-line py-24 text-center">
          <p className="font-serif text-lg text-ink-muted">Nothing here yet.</p>
          <p className="mt-2 text-sm text-ink-faint">Start your first post — it autosaves to your browser as you type.</p>
        </div>
      ) : (
        <>
          {drafts.length > 0 ? (
            <section className="mb-10">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-ink-faint">
                Drafts · {drafts.length}
              </h2>
              <ul>
                {drafts.map((p) => (
                  <PostRow key={p.slug} post={p} handle={handle} isDraft />
                ))}
              </ul>
            </section>
          ) : null}
          {published.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-ink-faint">
                Published · {published.length}
              </h2>
              <ul>
                {published.map((p) => (
                  <PostRow key={p.slug} post={p} handle={handle} isDraft={false} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}