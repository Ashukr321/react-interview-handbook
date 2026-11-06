"use client";

import { useEffect, useState } from "react";

type Mode = "auto" | "light" | "dark";

/** Runs before paint (inlined in <head>) so the saved theme never flashes. */
export const themeInitScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {}
  }, []);

  const change = (next: Mode) => {
    setMode(next);
    const root = document.documentElement;
    try {
      if (next === "auto") {
        delete root.dataset.theme;
        localStorage.removeItem("theme");
      } else {
        root.dataset.theme = next;
        localStorage.setItem("theme", next);
      }
    } catch {}
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
