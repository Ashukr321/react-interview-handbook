---
title: "A page takes 8-10 seconds to load. How would you optimize it?"
tags: ["performance", "loading", "lcp", "code-splitting"]
difficulty: "medium"
---

## Short answer

I run Lighthouse and a Network/Performance recording (throttled to a mid-range phone) to see where the seconds go: server response, render-blocking resources, a huge JavaScript bundle, request waterfalls or large images. Then I fix the biggest item first, usually code splitting, server rendering or streaming, parallel data fetching, image optimization and caching, and re-measure LCP after each change.

## Why it happens

```text
TTFB 1.5s -> HTML -> CSS/JS 3MB download+parse 3s -> app mounts
   -> fetch /user (0.8s) -> fetch /orders (1s) -> fetch /details (1s)
   -> 2MB hero image -> LCP at ~9s
```

Typical causes:

- **Huge JS bundle**: whole app, all routes and heavy libraries in one file.
- **Client-side rendering only**: blank screen until JS downloads, parses and fetches.
- **Waterfalls**: each component fetches after its parent renders.
- **Unoptimized images and fonts**: no compression, no sizes, no preload.
- **Slow backend / no caching**: high TTFB, no CDN.
- **Third-party scripts** blocking the main thread.

## How to fix it

### 1. Shrink and split JavaScript

```jsx
import { lazy, Suspense } from "react";
const Reports = lazy(() => import("./Reports"));

<Suspense fallback={<Spinner />}>
  <Reports />
</Suspense>
```

Split by route, lazy-load heavy widgets (charts, editors), replace big libraries (`moment` -> `date-fns`/`Intl`), and check the bundle analyzer.

### 2. Render HTML earlier

Use SSR/SSG or React Server Components (Next.js App Router) with streaming so the shell and LCP content arrive in the first HTML, and `<Suspense>` streams slower sections.

### 3. Kill waterfalls

```js
// Before: sequential awaits (1.8s)
const user = await getUser();
const orders = await getOrders();

// After: parallel (1s)
const [user, orders] = await Promise.all([getUser(), getOrders()]);
```

Route loaders (React Router) or server components fetch before render, not in nested `useEffect`s.

### 4. Optimize images, fonts and third parties

```html
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high" />
<img src="/hero.avif" width="1200" height="600" alt="Hero" fetchpriority="high" />
<img src="/footer.webp" loading="lazy" width="400" height="200" alt="" />
```

Use `font-display: swap`, self-host fonts, and load analytics with `defer` or after interaction.

### 5. Cache and compress

CDN for static assets with hashed filenames and `Cache-Control: public, max-age=31536000, immutable`, Brotli compression, HTTP/2 or HTTP/3, and API caching where data allows.

> **💡 Interview tip:** Quote numbers: "LCP went from 9 s to 2.3 s, JS from 2.8 MB to 600 KB". Interviewers remember measurable results.

## How to verify

- Lighthouse (mobile) and WebPageTest filmstrip before and after.
- Field data: p75 LCP under 2.5 s in RUM or CrUX.
- Bundle size budget enforced in CI.

## Follow-up questions

- **What is TTFB?** Time to first byte; a high value points to server, database or missing CDN caching.
- **Why not lazy-load the hero image?** It is the LCP element; lazy loading delays it.
- **What does streaming SSR give you?** The browser starts rendering the shell while slower parts still load.

## Quick recap

- Measure first: Lighthouse, Network waterfall, Performance.
- Split and shrink JS; render HTML on the server.
- Parallelize data fetching; no waterfalls.
- Optimize images/fonts, defer third parties, cache on a CDN.
