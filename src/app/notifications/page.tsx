import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import {
  NotificationList,
  type NotificationItem,
} from "@/components/notification-list";
import { PageTransition } from "@/components/page-transition";
import { getDisplayNameMap } from "@/lib/display-name";

export const dynamic = "force-dynamic";

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
  const items: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    actor: n.actor,
    actorName: n.actor ? names.get(n.actor) ?? `@${n.actor}` : "",
    postHandle: n.postHandle,
    postSlug: n.postSlug,
    body: n.body,
    dateLabel: formatDate(n.date),
    read: n.read,
  }));

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24">
        <NotificationList notifications={items} />
      </main>
    </PageTransition>
  );
}
