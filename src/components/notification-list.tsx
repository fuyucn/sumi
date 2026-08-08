 "use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { markNotificationsReadAction } from "@/app/community/actions";
import { NotificationIcon } from "@/components/notification-icon";
import { EmptyState } from "@/components/empty-state";
import { BellSimple } from "@phosphor-icons/react";
import type { NotificationType } from "@/content/types";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: string;
  actorName: string;
  postHandle?: string;
  postSlug?: string;
  body?: string;
  dateLabel: string;
  read: boolean;
}

const typeLabel: Record<NotificationType, string> = {
  comment: "commented on your post",
  reply: "replied to your comment",
  like: "liked your post",
  follow: "followed you",
  ai: "updated your post's AI 总结",
};

function NotificationRow({ n, isRead }: { n: NotificationItem; isRead: boolean }) {
  const label = typeLabel[n.type] ?? typeLabel.comment;
  const postHref = n.postHandle && n.postSlug ? `/@${n.postHandle}/${n.postSlug}` : null;
  const isAi = n.type === "ai";
  return (
    <li
      className={`-mx-3 flex gap-3 rounded-lg px-3 py-4 transition-colors duration-[var(--dur-long)] ease-[var(--ease-out)] ${
        isRead ? "hover:bg-paper-soft/70" : "bg-seal-wash/25 hover:bg-seal-wash/45"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-[var(--dur-long)] ease-[var(--ease-out)] ${
          isRead ? "bg-paper-soft text-ink-faint" : "bg-seal-wash text-seal"
        }`}
      >
        <NotificationIcon type={n.type} read={isRead} />
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <p className="text-ink">
          {isAi ? (
            <span className="font-medium text-ink">AI 总结</span>
          ) : (
            <Link
              href={`/@${n.actor}`}
              transitionTypes={["nav-forward"]}
              className="link-underline font-medium text-ink transition-colors hover:text-seal"
            >
              {n.actorName}
            </Link>
          )}{" "}
          {isAi ? <span className="text-ink-muted">updated</span> : label}
          {postHref ? (
            <>
              {" "}
              <Link
                href={postHref}
                transitionTypes={["nav-forward"]}
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
          {n.dateLabel}
          <span
            aria-hidden
            className={`ml-2 inline-block h-2 w-2 rounded-full bg-seal align-middle transition-[transform,opacity] duration-[var(--dur-long)] ease-[var(--ease-out)] ${
              isRead ? "scale-0 opacity-0" : "scale-100 opacity-100"
            }`}
          />
        </p>
      </div>
    </li>
  );
}

export function NotificationList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const reduce = useReducedMotion();

  // When the server list refreshes, drop optimistic ids that are no longer
  // unread (either the row disappeared or mark-all-read landed). Doing this
  // during render keeps the rollback and the server state in one source.
  const [prevNotifications, setPrevNotifications] = useState(notifications);
  if (prevNotifications !== notifications) {
    setPrevNotifications(notifications);
    setOptimisticIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) {
        const n = notifications.find((item) => item.id === id);
        if (n && !n.read) next.add(id);
      }
      return next;
    });
  }

  const unreadCount = notifications.filter(
    (n) => !n.read && !optimisticIds.has(n.id),
  ).length;

  function markAll() {
    if (unreadCount === 0 || pending) return;
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    setOptimisticIds((prev) => new Set([...prev, ...ids]));
    startTransition(async () => {
      const ok = await markNotificationsReadAction();
      if (!ok) {
        setOptimisticIds((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      } else {
        window.dispatchEvent(new Event("sumi:notifications-read"));
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
            Inbox
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
            Notifications
          </h1>
          <p className="mt-2 font-serif text-lg text-ink-muted">
            Comments, likes and follows, gathered in one place.
          </p>
        </div>
        <AnimatePresence initial={false}>
          {unreadCount > 0 ? (
            <motion.button
              key="mark-all"
              type="button"
              onClick={markAll}
              disabled={pending}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`btn-ghost px-4 py-1.5 text-sm ${
                pending ? "cursor-wait opacity-70" : ""
              }`}
            >
              {pending ? "Marking…" : "Mark all read"}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<BellSimple size={20} weight="duotone" />}
          title="Nothing yet."
          hint="Comments, likes and follows will show up here."
        />
      ) : (
        <>
          <ul className="drawer-stagger mt-10 divide-y divide-line border-y border-line">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                isRead={n.read || optimisticIds.has(n.id)}
              />
            ))}
          </ul>
          <AnimatePresence initial={false}>
            {unreadCount > 0 ? (
              <motion.p
                key="unread-summary"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 text-xs text-ink-faint"
              >
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </>
  );
}
