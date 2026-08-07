import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";

export const dynamic = "force-dynamic";

/** Unread notification count for the signed-in user (used by the nav badge). */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true, unread: 0 });
  const handle = await getUserHandle(user.id);
  if (!handle) return NextResponse.json({ ok: true, unread: 0 });
  const store = await getContentStoreForUser(user.id);
  if (!store) return NextResponse.json({ ok: true, unread: 0 });
  const notifications = await store.listNotifications(handle);
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ ok: true, unread });
}
