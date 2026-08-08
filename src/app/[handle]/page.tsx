import { notFound } from "next/navigation";
import Link from "next/link";
import { getReadContentStore } from "@/content";
import { PostCard } from "@/components/post-card";
import { CreatorProfile } from "@/components/creator-profile";
import { CreatorMagazines } from "@/components/creator-magazines";
import { FollowButton } from "@/components/follow-button";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { displayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  // Next delivers the param URL-encoded (e.g. "%40fuyucn"); decode before checks.
  const handleParam = decodeURIComponent(raw);
  if (!handleParam.startsWith("@")) notFound();
  const handle = handleParam.slice(1);
  const store = await getReadContentStore();
  if (!store) notFound();
  const posts = await store.listPosts({ handle, status: "published" });
  const notes = await store.listNotes(handle);
  const projects = await store.listProjects(handle);
  const pages = (await store.listPages(handle)).filter((p) => p.showInNav);
  const profile = await store.getProfile(handle);
  const authorName = displayName(handle, profile);
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;
  const followers = await store.listFollowers(handle);
  const following =
    signedInHandle !== null && signedInHandle !== handle
      ? (await store.listFollowing(signedInHandle)).includes(handle)
      : false;
  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <header className="mb-10">
        <CreatorProfile handle={handle} />
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <p className="text-sm text-ink-faint tabular-nums">
            {posts.length} {posts.length === 1 ? "post" : "posts"} · {followers.length}{" "}
            {followers.length === 1 ? "follower" : "followers"}
          </p>
          <Link
            href={`/@${handle}/notes`}
            className="link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {notes.length} {notes.length === 1 ? "note" : "notes"} →
          </Link>
          {projects.length > 0 ? (
            <Link
              href="/projects"
              className="link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {projects.length} {projects.length === 1 ? "project" : "projects"} →
            </Link>
          ) : null}
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/@${handle}/p/${page.slug}`}
              className="link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {page.title} →
            </Link>
          ))}
          {signedInHandle !== null && signedInHandle !== handle ? (
            <FollowButton
              handle={handle}
              initialCount={followers.length}
              initialFollowing={following}
            />
          ) : null}
        </div>
      </header>
      {posts.length === 0 ? (
        <p className="border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          Nothing published yet.
        </p>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {posts.map((post) => (
            <PostCard key={post.slug} handle={handle} post={post} authorName={authorName} />
          ))}
        </div>
      )}
      <CreatorMagazines handle={handle} />
    </main>
  );
}
