"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchItem } from "@/lib/content";

export default function Search({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);

  // "/" focuses search, like the reference site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return items
      .filter((it) => {
        const hay = `${it.title} ${it.context} ${"extra" in it ? it.extra : ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 12);
  }, [items, query]);

  const go = (href: string) => {
    router.push(href);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div className="search">
      <span className="search-icon" aria-hidden>
        ⌕
      </span>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search questions..."
        aria-label="Search questions"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setCursor((c) => Math.min(c + 1, results.length - 1));
          else if (e.key === "ArrowUp") setCursor((c) => Math.max(c - 1, 0));
          else if (e.key === "Enter" && results[cursor]) go(results[cursor].href);
          else if (e.key === "Escape") inputRef.current?.blur();
          else return;
          e.preventDefault();
        }}
      />
      <kbd>/</kbd>
      {focused && query && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="search-empty">No matches</li>}
          {results.map((r, i) => (
            <li key={r.href} role="option" aria-selected={i === cursor}>
              <button type="button" className={i === cursor ? "active" : ""} onMouseDown={() => go(r.href)}>
                <span className="sr-title">{r.title}</span>
                <span className="sr-context">{r.context}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
