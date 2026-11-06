import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Search from "@/components/Search";
import ThemeToggle, { themeInitScript } from "@/components/ThemeToggle";
import { getSearchIndex, getSections } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "React Interview Handbook", template: "%s · React Interview Handbook" },
  description:
    "React interview questions with answers, section by section: fundamentals, hooks, internals, performance, security and real-world scenarios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sections = getSections().map(({ slug, num, title, part, topics }) => ({
    slug,
    num,
    title,
    part,
    topics: topics.map(({ slug, num, title }) => ({ slug, num, title })),
  }));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-hidden tabIndex={-1} />
        <header className="topbar">
          <label htmlFor="nav-toggle" className="menu-btn" aria-label="Toggle navigation">
            ☰
          </label>
          <Link href="/" className="logo">
            React<span>Handbook</span>
          </Link>
          <div className="topbar-right">
            <Search items={getSearchIndex()} />
            <ThemeToggle />
          </div>
        </header>
        <div className="shell">
          <aside className="sidebar">
            <Sidebar sections={sections} />
          </aside>
          <label htmlFor="nav-toggle" className="scrim" aria-hidden />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
