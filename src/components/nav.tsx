"use client";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export function Nav() {
  const { data } = useSession();
  const user = data?.user as { username?: string; name?: string } | undefined;
  const handle = user?.username ?? user?.name;

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur">
      <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-lg font-medium text-stone-900 hover:opacity-80 transition-opacity"
        >
          Sumi 墨
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {handle ? (
            <>
              <Link
                href="/write"
                className="rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-700 transition-colors"
              >
                Write
              </Link>
              <Link
                href={`/@${handle}`}
                className="text-stone-500 hover:text-stone-900 transition-colors"
              >
                @{handle}
              </Link>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="text-stone-600 hover:text-stone-900 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
