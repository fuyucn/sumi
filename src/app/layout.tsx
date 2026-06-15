import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sumi 墨",
  description: "A minimalist publishing platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="font-sans bg-white text-stone-900 min-h-screen">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur">
          <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link href="/" className="font-serif text-lg font-medium text-stone-900 hover:opacity-80 transition-opacity">
              Sumi 墨
            </Link>
            <Link
              href="/write"
              className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              Write
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
