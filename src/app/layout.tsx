import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Nav } from "@/components/nav";
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
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sumi 墨",
  description: "A quiet place to write. Ink on paper, committed to your own GitHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="font-sans bg-paper text-ink min-h-screen flex flex-col antialiased">
        <Nav />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line">
          <div className="max-w-2xl mx-auto px-5 py-8 flex items-center justify-between text-xs text-ink-faint">
            <span className="font-serif">
              Sumi <span className="text-seal">墨</span>
            </span>
            <span>Ink on paper, kept in Git.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
