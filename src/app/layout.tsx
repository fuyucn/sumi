import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Geist, Newsreader } from "next/font/google";
import { Nav } from "@/components/nav";
import { SearchShortcut } from "@/components/search-shortcut";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sumi 墨",
  description: "A quiet place to write. Ink on paper, kept in your own space.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce minted in src/proxy.ts; Next also auto-stamps its own scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sumi-theme");var r=document.documentElement;if(t==="light"){r.classList.add("light");r.setAttribute("data-theme","light")}else if(t==="dark"){r.classList.add("dark");r.setAttribute("data-theme","dark")}}catch(e){}})();`,
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(/Mac|iPhone|iPad/.test(navigator.platform))document.documentElement.classList.add("mac")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="paper-grain font-sans bg-paper text-ink min-h-[100dvh] flex flex-col antialiased">
        <a
          href="#main"
          className="skip-link"
        >
          Skip to content
        </a>
        <SearchShortcut />
        <Nav />
        <div id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </div>
        <footer className="mt-24 border-t border-line">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between text-xs text-ink-faint">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-base font-medium text-ink">
                Sumi <span className="text-seal">墨</span>
              </span>
              <span className="hidden sm:inline" aria-hidden>
                /
              </span>
              <span>Ink on paper, kept in your space.</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href="/posts" className="link-underline transition-colors hover:text-ink-muted">
                Posts
              </Link>
              <Link href="/projects" className="link-underline transition-colors hover:text-ink-muted">
                Projects
              </Link>
              <Link href="/tags" className="link-underline transition-colors hover:text-ink-muted">
                Tags
              </Link>
              <Link href="/friends" className="link-underline transition-colors hover:text-ink-muted">
                Friends
              </Link>
              <Link href="/search" className="link-underline transition-colors hover:text-ink-muted">
                Search
              </Link>
              <a
                href="/feed.xml"
                className="link-underline transition-colors hover:text-ink-muted"
              >
                RSS
              </a>
              <span aria-hidden className="text-line-strong">·</span>
              <span>© {new Date().getFullYear()} Sumi</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
