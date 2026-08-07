"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Article,
  Bell,
  Feather,
  GearSix,
  House,
  MagnifyingGlass,
  SignIn,
  Tag,
  User,
} from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthorName } from "@/components/author-name";

const linkClass = (active: boolean) =>
  [
    "press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-seal-wash text-seal" : "text-ink-faint hover:text-ink",
  ].join(" ");

function IconLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${linkClass(active)} group relative`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      {children}
      <span
        role="tooltip"
        className="nav-tooltip pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-paper shadow-pop"
      >
        {label}
      </span>
    </Link>
  );
}

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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 font-serif text-lg font-semibold tracking-tight text-ink transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-seal font-sans text-[0.8125rem] font-bold text-paper shadow-sm transition-colors group-hover:bg-seal-soft"
          >
            墨
          </span>
          Sumi
        </Link>
        <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
          <Link
            href="/"
            className={linkClass(isActive("/"))}
            aria-current={isActive("/") ? "page" : undefined}
          >
            <House size={15} weight="duotone" aria-hidden />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link
            href="/archive"
            className={linkClass(isActive("/archive"))}
            aria-current={isActive("/archive") ? "page" : undefined}
          >
            <Article size={15} weight="duotone" aria-hidden />
            <span className="hidden sm:inline">Posts</span>
          </Link>
          {handle ? (
            <>
              <Link
                href={`/@${handle}`}
                className={linkClass(isActive(`/@${handle}`, true))}
                aria-current={isActive(`/@${handle}`, true) ? "page" : undefined}
              >
                <User size={15} weight="duotone" aria-hidden />
                <span className="hidden sm:inline">
                  <AuthorName handle={handle} />
                </span>
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
          <Link
            href="/tags"
            className={linkClass(isActive("/tags") || isActive("/tag/", true))}
            aria-current={isActive("/tags") || isActive("/tag/", true) ? "page" : undefined}
          >
            <Tag size={15} weight="duotone" aria-hidden />
            <span className="hidden sm:inline">Tags</span>
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <IconLink
            href="/search"
            label="Index"
            active={isActive("/search")}
          >
            <MagnifyingGlass size={15} weight="duotone" aria-hidden />
          </IconLink>
          {handle ? (
            <IconLink
              href="/notifications"
              label="Inbox"
              active={isActive("/notifications")}
            >
              <Bell size={15} weight="duotone" aria-hidden />
              {unread > 0 ? (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-seal px-1 text-[0.625rem] font-bold leading-none text-paper">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </IconLink>
          ) : null}
          {handle ? (
            <IconLink
              href="/settings"
              label="Settings"
              active={isActive("/settings")}
            >
              <GearSix size={15} weight="duotone" aria-hidden />
            </IconLink>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
