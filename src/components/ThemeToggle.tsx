"use client";

import { useSyncExternalStore } from "react";

type Mode = "auto" | "light" | "dark";

/** Runs before paint (next/script beforeInteractive) so the saved theme never flashes. */
export const themeInitScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

// The init script already put the saved theme on <html>, so that attribute is the source of truth.
const subscribe = (cb: () => void) => {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
};
const getMode = () => (document.documentElement.dataset.theme as Mode | undefined) ?? "auto";

export default function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "auto" as Mode);

  const change = (next: Mode) => {
    const root = document.documentElement;
    if (next === "auto") delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (next === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <label className="theme-toggle">
      <span aria-hidden>{mode === "dark" ? "🌙" : mode === "light" ? "☀️" : "💻"}</span>
      <select aria-label="Color theme" value={mode} onChange={(e) => change(e.target.value as Mode)}>
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
