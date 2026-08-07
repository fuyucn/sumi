import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import type { Notification, NotificationType } from "@/content/types";
import { NotificationIcon } from "@/components/notification-icon";
import { markNotificationsReadAction } from "@/app/community/actions";
import { getDisplayNameMap } from "@/lib/display-name";

export const dynamic = "force-dynamic";

const typeLabel: Record<NotificationType, string> = {
  comment: "commented on your post",
  reply: "replied to your comment",
  like: "liked your post",
  follow: "followed you",
  ai: "updated your post's AI 导读",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function NotificationRow({ n, actorName }: { n: Notification; actorName: string }) {
  const label = typeLabel[n.type] ?? typeLabel.comment;
  const postHref = n.postHandle && n.postSlug ? `/@${n.postHandle}/${n.postSlug}` : null;
  const isAi = n.type === "ai";
  return (
    <li className="flex gap-3 py-4">
      <span
        aria-hidden
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          n.read ? "bg-paper-soft text-ink-faint" : "bg-seal-wash text-seal"
        }`}
      >
        <NotificationIcon type={n.type} read={n.read} />
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <p className="text-ink">
          {isAi ? (
            <span className="font-medium text-ink">AI 导读</span>
          ) : (
            <Link
              href={`/@${n.actor}`}
              className="link-underline font-medium text-ink transition-colors hover:text-seal"
            >
              {actorName}
            </Link>
          )}{" "}
          {isAi ? (
            <span className="text-ink-muted">updated</span>
          ) : (
            label
          )}
          {postHref ? (
            <>
              {" "}
              <Link
                href={postHref}
                className="link-underline text-ink-muted transition-colors hover:text-seal"
              >
                your post
              </Link>
            </>
          ) : null}
        </p>
        {n.body ? (
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-ink-muted">
            {n.body}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-ink-faint">
          {formatDate(n.date)}
          {!n.read ? (
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-seal align-middle" />
          ) : null}
        </p>
      </div>
    </li>
  );
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  const notifications = (await store?.listNotifications(handle)) ?? [];
  const names = await getDisplayNameMap(
    notifications.map((n) => n.actor).filter((a): a is string => Boolean(a)),
  );
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            Notifications
          </h1>
          <p className="mt-2 font-serif text-lg text-ink-muted">
            Comments, likes and follows, gathered in one place.
          </p>
        </div>
        {unread > 0 ? (
          <form action={markNotificationsReadAction}>
            <button type="submit" className="btn-ghost px-4 py-1.5 text-sm">
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-16 border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          Nothing yet. Comments, likes and follows will show up here.
        </p>
      ) : (
        <>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                actorName={n.actor ? names.get(n.actor) ?? `@${n.actor}` : ""}
              />
            ))}
          </ul>
          {unread > 0 ? (
            <p className="mt-4 text-xs text-ink-faint">
              {unread} unread notification{unread === 1 ? "" : "s"}
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
