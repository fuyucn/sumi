"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Article,
  Bell,
  Feather,
  GearSix,
  House,
  List,
  MagnifyingGlass,
  SignIn,
  Tag,
  X,
} from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDisplayName } from "@/components/use-display-name";
import { useMotionValueEvent, useScroll } from "motion/react";

const linkClass = (active: boolean) =>
  [
    "press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-seal-wash text-seal" : "text-ink-faint hover:text-ink",
  ].join(" ");

const iconClass = (active: boolean) =>
  [
    "press group relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
    active
      ? "bg-seal-wash text-seal hover:text-seal"
      : "text-ink-faint hover:text-ink",
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
      className={iconClass(active)}
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

function DrawerLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-seal-wash text-seal" : "text-ink-soft hover:bg-seal-wash/40 hover:text-ink"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function UserChip({ handle }: { handle: string }) {
  const name = useDisplayName(handle);
  const initial = (name || handle).trim().charAt(0).toUpperCase() || "?";
  return (
    <Link
      href={`/@${handle}`}
      className="press group relative flex h-9 items-center gap-2 rounded-full border border-line-strong bg-paper pl-1 pr-3 text-sm font-medium text-ink transition-colors hover:border-seal/40 hover:bg-seal-wash/40"
      aria-label={`Profile of ${name}`}
    >
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-seal text-xs font-bold text-paper"
      >
        {initial}
      </span>
      <span className="hidden max-w-28 truncate sm:inline">{name}</span>
      <span
        role="tooltip"
        className="nav-tooltip pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-paper shadow-pop"
      >
        {name}
      </span>
    </Link>
  );
}

function DrawerUserRow({
  handle,
  onClick,
}: {
  handle: string;
  onClick?: () => void;
}) {
  const name = useDisplayName(handle);
  const initial = (name || handle).trim().charAt(0).toUpperCase() || "?";
  return (
    <Link
      href={`/@${handle}`}
      onClick={onClick}
      className="press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-seal-wash/40"
    >
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-full bg-seal text-xs font-bold text-paper"
      >
        {initial}
      </span>
      <span className="truncate">{name}</span>
    </Link>
  );
}

export function Nav() {
  const { data } = useSession();
  const user = data?.user as { username?: string; name?: string } | undefined;
  const handle = user?.username ?? user?.name;
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));

  useEffect(() => {
    // Close the mobile drawer after navigation (also covers browser back/forward).
    const id = requestAnimationFrame(() => setMenuOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const menuButton = menuButtonRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = document.querySelector<HTMLElement>(
      'nav[aria-label="Mobile"] a',
    );
    firstLink?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      menuButton?.focus();
    };
  }, [menuOpen]);

  const isActive = (href: string, prefix = false) =>
    prefix ? pathname.startsWith(href) : pathname === href;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-line backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-[var(--dur-short)] ${
        scrolled
          ? "bg-paper/95 shadow-[0_12px_32px_-24px_rgb(30_27_22/0.25)]"
          : "bg-paper/70"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 font-serif text-lg font-semibold tracking-tight text-ink transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden
            className="seal-stamp flex h-7 w-7 items-center justify-center rounded-[8px] bg-seal font-sans text-[0.8125rem] font-bold text-paper shadow-sm group-hover:bg-seal-soft"
          >
            墨
          </span>
          Sumi
        </Link>

        {/* Site navigation: Home → Posts → Tags (Tags always last). */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-sm md:flex">
          <Link
            href="/"
            className={linkClass(isActive("/"))}
            aria-current={isActive("/") ? "page" : undefined}
          >
            <House size={15} weight="duotone" aria-hidden />
            Home
          </Link>
          <Link
            href="/posts"
            className={linkClass(isActive("/posts"))}
            aria-current={isActive("/posts") ? "page" : undefined}
          >
            <Article size={15} weight="duotone" aria-hidden />
            Posts
          </Link>
          <Link
            href="/tags"
            className={linkClass(isActive("/tags") || isActive("/tag/", true))}
            aria-current={
              isActive("/tags") || isActive("/tag/", true) ? "page" : undefined
            }
          >
            <Tag size={15} weight="duotone" aria-hidden />
            Tags
          </Link>
        </nav>

        {/* Tool + user cluster. */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <IconLink href="/search" label="Index" active={isActive("/search")}>
            <MagnifyingGlass size={16} weight="duotone" aria-hidden />
          </IconLink>
          {handle ? (
            <>
              <div className="hidden md:block">
                <IconLink
                  href="/notifications"
                  label="Inbox"
                  active={isActive("/notifications")}
                >
                  <Bell size={16} weight="duotone" aria-hidden />
                  {unread > 0 ? (
                    <span
                      key={unread}
                      className="badge-pop pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-seal px-1 text-[0.625rem] font-bold leading-none text-paper"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </IconLink>
              </div>
              <div className="hidden md:block">
                <IconLink
                  href="/settings"
                  label="Settings"
                  active={isActive("/settings")}
                >
                  <GearSix size={16} weight="duotone" aria-hidden />
                </IconLink>
              </div>
              <Link
                href="/write"
                className="btn-primary hidden px-4 py-1.5 md:inline-flex"
              >
                <Feather size={15} weight="duotone" aria-hidden />
                Write
              </Link>
              <div className="hidden md:block">
                <UserChip handle={handle} />
              </div>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="btn-ghost hidden md:inline-flex"
            >
              <SignIn size={15} weight="duotone" aria-hidden />
              Sign in
            </Link>
          )}
          <ThemeToggle />
          <button
            type="button"
            ref={menuButtonRef}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-ink md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="relative block h-[18px] w-[18px]">
              <X
                size={18}
                weight="duotone"
                aria-hidden
                className={`absolute inset-0 transition-all duration-[var(--dur-short)] ${
                  menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
                }`}
              />
              <List
                size={18}
                weight="duotone"
                aria-hidden
                className={`absolute inset-0 transition-all duration-[var(--dur-short)] ${
                  menuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="md:hidden">
              <div
                className="fixed inset-0 z-[45] bg-ink/20 backdrop-blur-[2px] animate-fade-in"
                aria-hidden
                onClick={closeMenu}
              />
              <div
                className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-pop animate-drawer-in"
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
              >
            <nav className="drawer-stagger flex flex-col gap-0.5" aria-label="Mobile">
              <DrawerLink href="/" active={isActive("/")} onClick={closeMenu}>
                <House size={17} weight="duotone" aria-hidden />
                Home
              </DrawerLink>
              <DrawerLink
                href="/posts"
                active={isActive("/posts")}
                onClick={closeMenu}
              >
                <Article size={17} weight="duotone" aria-hidden />
                Posts
              </DrawerLink>
              <DrawerLink
                href="/tags"
                active={isActive("/tags") || isActive("/tag/", true)}
                onClick={closeMenu}
              >
                <Tag size={17} weight="duotone" aria-hidden />
                Tags
              </DrawerLink>
            </nav>

            <div className="my-3 h-px bg-line" aria-hidden />

            {handle ? (
              <div className="drawer-stagger flex flex-col gap-1">
                <DrawerUserRow handle={handle} onClick={closeMenu} />
                <Link
                  href="/write"
                  onClick={closeMenu}
                  className="btn-primary mt-1 w-full"
                >
                  <Feather size={15} weight="duotone" aria-hidden />
                  Write
                </Link>
                <DrawerLink
                  href="/notifications"
                  active={isActive("/notifications")}
                  onClick={closeMenu}
                >
                  <Bell size={17} weight="duotone" aria-hidden />
                  Inbox
                  {unread > 0 ? (
                    <span
                      key={unread}
                      className="badge-pop ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-seal px-1.5 text-[0.6875rem] font-bold leading-none text-paper"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </DrawerLink>
                <DrawerLink
                  href="/settings"
                  active={isActive("/settings")}
                  onClick={closeMenu}
                >
                  <GearSix size={17} weight="duotone" aria-hidden />
                  Settings
                </DrawerLink>
              </div>
            ) : (
              <Link
                href="/sign-in"
                onClick={closeMenu}
                className="btn-primary w-full"
              >
                <SignIn size={15} weight="duotone" aria-hidden />
                Sign in
              </Link>
            )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
