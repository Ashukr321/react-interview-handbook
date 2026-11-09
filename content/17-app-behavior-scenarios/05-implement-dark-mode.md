---
title: "Your React app needs to support dark mode. How do you implement it?"
tags: ["theming", "dark-mode", "css-variables", "ux"]
difficulty: "medium"
---

## Short answer

Define colors as **CSS custom properties** and switch them with a `data-theme` attribute on the root element, defaulting to the OS setting via `prefers-color-scheme`. Keep the user's choice (`light`, `dark` or `system`) in React context and persist it in `localStorage`. Apply the theme with a tiny **blocking script before React loads** so there's no flash of the wrong theme. Styling stays in CSS, so switching themes doesn't re-render the whole app.

## Why it happens

Common problems with naive implementations:

- **Flash of incorrect theme**: React reads `localStorage` after the first paint, so users see light mode briefly.
- **Theme in JS objects** (e.g. passing colors through context to every component) re-renders the whole tree on toggle and is hard to keep consistent.
- **Ignoring the OS preference**, or not reacting when it changes.
- **SSR hydration mismatch**: the server doesn't know the user's theme, so the markup differs from the client.
- Native controls and scrollbars stay light because the `color-scheme` property isn't set.

## How to fix it

1. **Tokens in CSS variables**, overridden per theme.
2. **System default** with `prefers-color-scheme`, overridden by an explicit choice.
3. **Inline script in the document head** that sets `data-theme` before first paint.
4. **Theme context** for the toggle; it only updates the attribute and storage.
5. **Listen to OS changes** when the choice is `system`.

```css
:root {
  --bg: #ffffff;
  --text: #111827;
  --accent: #2563eb;
  color-scheme: light;
}
:root[data-theme="dark"] {
  --bg: #0b1120;
  --text: #e5e7eb;
  --accent: #60a5fa;
  color-scheme: dark;
}
body {
  background: var(--bg);
  color: var(--text);
}
```

```html
<!-- in the document head, before the app bundle -->
<script>
  (function () {
    try {
      var saved = localStorage.getItem("theme") || "system";
      var dark =
        saved === "dark" ||
        (saved === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch (e) {}
  })();
</script>
```

```jsx
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(
    () => localStorage.getItem("theme") ?? "system"
  );

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = choice === "dark" || (choice === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    localStorage.setItem("theme", choice);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [choice]);

  return (
    <ThemeContext.Provider value={{ choice, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

For SSR (Next.js), read `localStorage` only on the client (the inline script handles first paint), add `suppressHydrationWarning` on the root element because the script changes its attribute, or use a library like `next-themes`. Tailwind supports this with a `dark:` variant configured to use the `data-theme` attribute.

## How to verify

- Toggle the OS theme with "system" selected: the app follows without reload.
- Hard reload in dark mode with CPU throttling: no white flash.
- Check contrast ratios (WCAG AA, 4.5:1 for body text) in both themes.
- Check form controls, scrollbars, images and charts in dark mode.
- No hydration warnings in the console for SSR apps.

## Follow-up questions

- **Why CSS variables instead of a JS theme object?** The browser restyles without React re-rendering, and non-React parts (portals, third-party widgets) pick up the theme.
- **How do you sync across tabs?** Listen to the `storage` event and update the choice.
- **How about images?** Use the `picture` element with a `prefers-color-scheme` media query, or a CSS filter for icons.

## Quick recap

- CSS variables + `data-theme` on the root.
- Default to `prefers-color-scheme`, store explicit choice.
- Blocking head script prevents theme flash.
- Context only manages the choice, not every color.
- Check contrast and `color-scheme` for native UI.
