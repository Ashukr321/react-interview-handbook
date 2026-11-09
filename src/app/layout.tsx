import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Search from "@/components/Search";
import PwaRegister from "@/components/PwaRegister";
import ThemeToggle, { themeInitScript } from "@/components/ThemeToggle";
import { getSearchIndex, getSections } from "@/lib/content";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "React interview questions",
    "React.js interview",
    "frontend interview",
    "React hooks",
    "React Fiber",
    "React performance",
    "Redux Toolkit",
    "React scenario-based questions",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "React Handbook", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1016" },
  ],
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
        <PwaRegister />
      </body>
    </html>
  );
}
