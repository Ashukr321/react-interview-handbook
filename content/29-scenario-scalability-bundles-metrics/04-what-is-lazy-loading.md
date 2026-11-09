---
title: "What is lazy loading?"
tags: ["lazy-loading", "code-splitting", "react-lazy", "suspense"]
difficulty: "easy"
---

## Short answer

Lazy loading means loading a resource only when it is needed instead of upfront. In React it usually means code splitting with `React.lazy` and dynamic `import()`, so a component's JavaScript is downloaded the first time it renders, with `<Suspense>` showing a fallback meanwhile. The same idea applies to images (`loading="lazy"`), data and third-party scripts, and it reduces initial bundle size and speeds up first load.

## Explanation

Think of a streaming service: it does not download the whole series before you watch episode one. It fetches each episode when you press play.

### How code splitting works

```text
Without lazy loading:   main.js (1.8 MB: home + admin + charts + editor)
With lazy loading:      main.js (300 KB)
                        admin.[hash].js   -> loaded when /admin is visited
                        charts.[hash].js  -> loaded when the chart renders
```

When the bundler (Vite, webpack, Next.js) sees `import("./Admin")`, it creates a separate chunk. The browser fetches that chunk only when the code runs.

### What to lazy-load

| Good candidates | Keep eager |
| --- | --- |
| Routes and pages | The first screen's content |
| Modals, drawers, tabs not shown initially | The LCP image |
| Heavy libraries (charts, editors, maps, PDF) | Small, always-used components |
| Images and iframes below the fold | Critical CSS |

### Related techniques

- **Images**: `<img loading="lazy">`, or `next/image` which lazy-loads by default.
- **Prefetching**: start loading a chunk on hover or when the browser is idle, so it is ready when clicked.
- **Next.js**: routes are split automatically; `next/dynamic` lazy-loads client components.

## Example

```jsx
import { lazy, Suspense, useState } from "react";

const ChartPanel = lazy(() => import("./ChartPanel"));
// named export: lazy(() => import("./Charts").then((m) => ({ default: m.ChartPanel })))

const preloadChart = () => import("./ChartPanel"); // prefetch on hover

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  return (
    <>
      <button onMouseEnter={preloadChart} onClick={() => setShowChart(true)}>
        Show chart
      </button>
      {showChart && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <ChartPanel />
        </Suspense>
      )}
    </>
  );
}
```

> **⚠️ Gotcha:** Declare `lazy()` at module level, not inside a component. Inside a component, a new lazy component is created every render, which remounts it and loses state.

## Common mistakes

- Lazy-loading the hero image or above-the-fold content, which makes LCP worse.
- Splitting tiny components into many chunks, adding request overhead for little gain.
- No Error Boundary around lazy components, so a failed chunk download crashes the page.
- Showing a spinner flash for fast loads; wrap navigations in `startTransition` to keep the old UI visible.

## Follow-up questions

- **Does `React.lazy` work with named exports?** Not directly; it needs a default export, so map the named export to `default`.
- **What happens if the chunk fails to load?** The promise rejects and the nearest Error Boundary catches it; you can show a retry button.
- **Lazy loading vs prefetching?** Lazy loading delays the download; prefetching starts it early in the background so the delay is hidden.

## Quick recap

- Load resources only when needed.
- `React.lazy` + dynamic `import()` + `<Suspense>` split code into chunks.
- Lazy-load routes, modals, heavy libraries, off-screen images.
- Never lazy-load what is needed for the first paint.
