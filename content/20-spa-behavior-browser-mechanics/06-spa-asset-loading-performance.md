---
title: "How are assets (JS, CSS) handled in SPAs, and how does it impact performance?"
tags: ["spa", "performance", "code-splitting", "bundling"]
difficulty: "medium"
---

## Short answer

A bundler (Vite, webpack) packages the app's JS and CSS into hashed files referenced from `index.html`. The browser downloads them on the first load, then the app runs entirely from memory; later navigations only download lazy route chunks and data. The trade-off: a heavier first load (download, parse and execute JS before anything meaningful appears) in exchange for very fast subsequent navigation. Code splitting, caching and compression keep that first cost small.

## Explanation

Think of moving into a furnished apartment: an SPA brings all the furniture on day one (slow move-in, then everything is at hand). Code splitting brings only the bedroom first and delivers the rest of the rooms when you first walk into them.

### How assets flow

```text
 Build:  src/**  --bundler-->  index.html
                                assets/index-a1b2.js     (entry + app shell)
                                assets/vendor-c3d4.js    (react, router...)
                                assets/Reports-e5f6.js   (lazy route chunk)
                                assets/index-7a8b.css

 First visit:  HTML -> CSS (render-blocking) + entry JS + vendor JS -> render
 Navigate to /reports:  download Reports-e5f6.js once, then cached
 Repeat visit: hashed files come from the HTTP cache, only HTML revalidated
```

### Performance impact

| Factor | Effect | Mitigation |
|---|---|---|
| Large initial bundle | Slower FCP/LCP, long main-thread tasks | Route-level code splitting, remove unused deps |
| JS parse/execute cost | Slower interactivity on low-end phones | Ship less JS, Server Components, defer third-party scripts |
| Render-blocking CSS | Delays first paint | Critical CSS, CSS per route chunk |
| Request waterfalls (HTML -> JS -> lazy chunk -> data) | Late content | Preload/modulepreload, loaders that fetch data in parallel |
| Cache busting on deploy | Users re-download everything | Content-hash names, separate vendor chunk |
| Transfer size | Slow on mobile networks | Brotli, CDN, HTTP/2 or HTTP/3 |
| Long-lived sessions | Memory leaks over time | Clean up effects, listeners and caches |

CSS imported by a component ends up in that component's chunk (or extracted CSS file), so splitting JS by route usually splits CSS too.

## Example

```jsx
import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import Home from "./pages/Home"; // in the main bundle: needed immediately

const Reports = lazy(() => import("./pages/Reports")); // separate chunk
const Settings = lazy(() => import("./pages/Settings"));

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/reports", element: <Suspense fallback={<p>Loading...</p>}><Reports /></Suspense> },
  { path: "/settings", element: <Suspense fallback={<p>Loading...</p>}><Settings /></Suspense> },
]);

// Warm the chunk on hover so the click feels instant
export const prefetchReports = () => import("./pages/Reports");

export default function App() {
  return <RouterProvider router={router} />;
}
```

## Common mistakes

- Splitting into dozens of tiny chunks, creating more waterfalls than savings.
- Lazy loading the first screen the user sees.
- Importing a whole library (`import _ from "lodash"`) instead of individual functions or a tree-shakeable version.
- Caching `index.html` long-term, so it points at deleted chunks after a deploy.

## Follow-up questions

- **How do you handle a failed chunk load after a deploy?** Keep old assets on the CDN for a while, and catch chunk load errors in an error boundary that offers a reload.
- **How do you measure bundle cost?** Bundle analyzer for size, Lighthouse and the Performance panel for parse/execute time, Core Web Vitals in production.
- **Should CSS be in JS?** Runtime CSS-in-JS adds JS cost; zero-runtime options (CSS Modules, Tailwind, vanilla-extract) extract static CSS files.

## Quick recap

- Bundler outputs hashed JS/CSS files linked from one HTML shell.
- First load is heavy; later navigations are fast.
- Route-level code splitting and prefetching keep the start fast.
- Content hashes plus a CDN give long-term caching.
- Watch JS parse cost on low-end devices, not just bytes.
