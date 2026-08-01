"use client";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export function Nav() {
  const { data } = useSession();
  const user = data?.user as { username?: string; name?: string } | undefined;
  const handle = user?.username ?? user?.name;

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="group font-serif text-lg font-medium tracking-tight text-ink transition-opacity hover:opacity-90"
        >
          Sumi{" "}
          <span className="text-seal transition-colors group-hover:text-seal-soft">墨</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {handle ? (
            <>
              <Link
                href={`/@${handle}`}
                className="link-underline text-ink-muted transition-colors hover:text-ink"
              >
                @{handle}
              </Link>
              <Link
                href="/settings"
                className="link-underline text-ink-faint transition-colors hover:text-ink-muted"
              >
                Settings
              </Link>
              <Link
                href="/write"
                className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper transition-colors hover:bg-ink-soft"
              >
                Write
              </Link>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="link-underline text-ink-muted transition-colors hover:text-ink"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
