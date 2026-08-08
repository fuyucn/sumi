import Link from "next/link";
import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { getCurrentUser } from "@/lib/current-user";
import { FriendForm } from "@/components/friend-form";
import { DeleteFriendButton } from "@/components/delete-friend-button";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const store = await getReadContentStore();
  if (!store) notFound();
  const friends = await store.listFriends();
  const user = await getCurrentUser();
  const signedIn = !!user;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        Friends
      </h1>
      <p className="mt-2 font-serif text-lg text-ink-muted">
        A small ring of the web, a few links worth keeping.
      </p>

      {signedIn ? (
        <div className="mt-8">
          <FriendForm />
        </div>
      ) : null}

      {friends.length === 0 ? (
        <p className="mt-16 border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          {signedIn
            ? "No friends yet. Add your first link above."
            : "No friends yet."}
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="card group lift flex items-start gap-3 p-4"
            >
              {friend.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={friend.avatar}
                  alt=""
                  width={44}
                  height={44}
                  className="mt-0.5 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-hidden
                  className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-seal-wash font-serif text-lg font-semibold text-seal"
                >
                  {friend.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={friend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline truncate font-serif text-lg font-medium text-ink transition-colors hover:text-ink"
                  >
                    {friend.name}
                  </Link>
                  {signedIn ? <DeleteFriendButton id={friend.id} /> : null}
                </div>
                {friend.bio ? (
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {friend.bio}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
