"use client";

import { useEffect } from "react";

// Mobile uses the CSS #nav-toggle checkbox drawer; desktop collapses the column via a class on <html>.
const MOBILE = "(max-width: 900px)";

function toggleSidebar() {
  if (window.matchMedia(MOBILE).matches) {
    const box = document.getElementById("nav-toggle") as HTMLInputElement | null;
    if (box) box.checked = !box.checked;
  } else {
    document.documentElement.classList.toggle("sidebar-closed");
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

export default function SidebarToggle() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if ((mod && e.code === "KeyB") || (!mod && e.shiftKey && e.code === "Slash" && !isTyping(e.target))) {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === "Escape") {
        const box = document.getElementById("nav-toggle") as HTMLInputElement | null;
        if (box) box.checked = false;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button type="button" className="menu-btn" aria-label="Toggle sidebar (Ctrl+B)" title="Toggle sidebar (Ctrl+B)" onClick={toggleSidebar}>
      ☰
    </button>
  );
}
