"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavSection = {
  slug: string;
  num: string;
  title: string;
  part: string;
  topics: { slug: string; num: string; title: string }[];
};

export default function Sidebar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const activeSection = pathname.split("/")[1] ?? "";
  const [open, setOpen] = useState<Set<string>>(() => new Set([activeSection]));

  // Auto-expand the section you navigate into (search, prev/next links).
  useEffect(() => {
    if (activeSection) setOpen((prev) => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
  }, [activeSection]);

  // Close the mobile drawer (CSS checkbox in layout) after navigating.
  useEffect(() => {
    const toggle = document.getElementById("nav-toggle") as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  }, [pathname]);

  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const parts = [...new Set(sections.map((s) => s.part))];

  return (
    <nav className="sidebar-nav" aria-label="Sections">
      <Link href="/" className={`nav-home ${pathname === "/" ? "active" : ""}`}>
        🏠 Home
      </Link>
      {parts.map((part) => (
        <div key={part}>
          <div className="nav-part">{part}</div>
          {sections
            .filter((s) => s.part === part)
            .map((s) => {
              const isOpen = open.has(s.slug);
              const isActive = activeSection === s.slug;
              return (
                <div key={s.slug} className="nav-section">
                  <button
                    type="button"
                    className={`nav-section-btn ${isActive ? "active" : ""}`}
                    aria-expanded={isOpen}
                    onClick={() => toggle(s.slug)}
                  >
                    <span>
                      <span className="nav-level">
                        Section {s.num} · {s.topics.length} topics
                      </span>
                      <span className="nav-title">{s.title}</span>
                    </span>
                    <span className={`chev ${isOpen ? "open" : ""}`} aria-hidden>
                      ›
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="nav-topics">
                      <li>
                        <Link href={`/${s.slug}`} className={pathname === `/${s.slug}` ? "active" : ""}>
                          Overview
                        </Link>
                      </li>
                      {s.topics.map((t) => {
                        const href = `/${s.slug}/${t.slug}`;
                        return (
                          <li key={t.slug}>
                            <Link href={href} className={pathname === href ? "active" : ""}>
                              <span className="nav-num">{t.num}</span>
                              {t.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
