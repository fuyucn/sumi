"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Feather,
  GearSix,
  MagnifyingGlass,
  SignIn,
  Tag,
  User,
} from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";

export function Nav() {
  const { data } = useSession();
  const user = data?.user as { username?: string; name?: string } | undefined;
  const handle = user?.username ?? user?.name;
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    fetch("/api/notifications/unread")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && typeof j?.unread === "number") setUnread(j.unread);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [handle, pathname]);

  const isActive = (href: string, prefix = false) =>
    prefix ? pathname.startsWith(href) : pathname === href;

  const linkClass = (active: boolean) =>
    [
      "press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-seal-wash text-seal"
        : "text-ink-faint hover:text-ink",
    ].join(" ");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-ink transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-seal font-sans text-[0.8125rem] font-bold text-paper shadow-sm transition-colors group-hover:bg-seal-soft"
          >
            墨
          </span>
          Sumi
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/search"
            className={linkClass(isActive("/search"))}
            aria-current={isActive("/search") ? "page" : undefined}
          >
            <MagnifyingGlass size={15} weight="duotone" aria-hidden />
            <span className="hidden sm:inline">Search</span>
          </Link>
          <Link
            href="/tags"
            className={linkClass(isActive("/tags") || isActive("/tag/", true))}
            aria-current={isActive("/tags") || isActive("/tag/", true) ? "page" : undefined}
          >
            <Tag size={15} weight="duotone" aria-hidden />
            <span className="hidden sm:inline">Tags</span>
          </Link>
          {handle ? (
            <>
              <Link
                href="/notifications"
                className={`${linkClass(isActive("/notifications"))} relative`}
                aria-current={isActive("/notifications") ? "page" : undefined}
                aria-label="Notifications"
              >
                <Bell size={15} weight="duotone" aria-hidden />
                <span className="hidden sm:inline">Inbox</span>
                {unread > 0 ? (
                  <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-seal px-1 text-[0.625rem] font-bold leading-none text-paper">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <Link
                href={`/@${handle}`}
                className={linkClass(isActive(`/@${handle}`, true))}
                aria-current={isActive(`/@${handle}`, true) ? "page" : undefined}
              >
                <User size={15} weight="duotone" aria-hidden />
                <span className="hidden sm:inline">@{handle}</span>
              </Link>
              <Link
                href="/settings"
                className={linkClass(isActive("/settings"))}
                aria-current={isActive("/settings") ? "page" : undefined}
              >
                <GearSix size={15} weight="duotone" aria-hidden />
                <span className="hidden sm:inline">Settings</span>
              </Link>
              <Link
                href="/write"
                className="btn-primary ml-1 px-4 py-1.5"
              >
                <Feather size={15} weight="duotone" aria-hidden />
                Write
              </Link>
            </>
          ) : (
            <Link
              href="/sign-in"
              className={linkClass(isActive("/sign-in"))}
              aria-current={isActive("/sign-in") ? "page" : undefined}
            >
              <SignIn size={15} weight="duotone" aria-hidden />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
