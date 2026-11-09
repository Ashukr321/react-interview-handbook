---
title: "How does React handle hydration in server-rendered applications?"
tags: ["hydration", "ssr", "hydrateRoot"]
difficulty: "hard"
---

## Short answer

Hydration is the process where React, running in the browser, takes HTML that was already rendered on the server and **attaches** to it instead of recreating it: it renders the same component tree in memory, matches it against the existing DOM, wires up event handlers and state, and makes the page interactive. You start it with `hydrateRoot`. The server and the first client render must produce the **same output**, otherwise React reports a hydration mismatch.

## Explanation

Server-rendered HTML is like a mannequin in a shop window: it looks right but cannot move. Hydration brings it to life by connecting the nerves (event handlers) to a body that is already there, without rebuilding it.

```text
 Server: render <App /> -> HTML string/stream -> sent to browser
 Browser: show HTML immediately (not interactive)
          download JS bundle
          hydrateRoot(container, <App />)
            -> React renders the tree, walks existing DOM nodes
            -> reuses nodes, attaches listeners, initialises state
            -> runs effects
          page is interactive
```

### Selective and progressive hydration (React 18+)

With streaming SSR and Suspense boundaries:

- Each Suspense boundary can hydrate **independently**.
- React prioritises hydrating the part the user clicks or types into.
- Events that happen before hydration are replayed afterwards.

### Hydration mismatches

Caused by output that differs between server and client:

- `Date.now()`, `Math.random()`, locale or timezone formatting.
- Reading `window`, `localStorage` or `navigator` during render.
- Invalid HTML nesting (e.g. `<div>` inside `<p>`), which the browser silently fixes.
- Browser extensions injecting markup.

React 19 shows a single diff-style error for mismatches and tolerates third-party scripts and extensions inserting elements in `head` and `body`.

### Fixing mismatches

- Move browser-only values into `useEffect` and render a stable placeholder first.
- Use `useId` for IDs instead of random values.
- For unavoidable text differences (like a timestamp), add `suppressHydrationWarning` to that one element.
- In Next.js, mark browser-only components with `dynamic(() => import(...), { ssr: false })` from a Client Component.

## Example

```jsx
// client entry
import { hydrateRoot } from "react-dom/client";
import App from "./App";

hydrateRoot(document.getElementById("root"), <App />);
```

```jsx
import { useEffect, useState } from "react";

// Mismatch-safe: server and first client render both show "--:--"
export function LocalTime() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
  }, []);

  return <span>{time ?? "--:--"}</span>;
}
```

## Common mistakes

- Using `createRoot` on server-rendered HTML, which throws the markup away and re-renders from scratch.
- Branching on `typeof window !== "undefined"` during render, which guarantees different output.
- Sprinkling `suppressHydrationWarning` everywhere to hide real bugs. It only works one level deep anyway.
- Shipping a huge bundle, so hydration (and interactivity) is delayed even though HTML arrived fast.

## Follow-up questions

- **What is the "uncanny valley" of SSR?** The page looks ready but clicks do nothing until hydration completes.
- **How do Server Components reduce hydration cost?** Their code never ships to the client, so only Client Components need hydrating.
- **What is partial or islands hydration?** Hydrating only interactive regions of a mostly static page (Astro islands); React approaches this via Server Components and Suspense.

## Quick recap

- Hydration attaches React to existing server HTML via `hydrateRoot`.
- Server and first client render must match.
- Suspense enables selective, prioritised hydration.
- Move browser-only values to effects; use `useId` for IDs.
