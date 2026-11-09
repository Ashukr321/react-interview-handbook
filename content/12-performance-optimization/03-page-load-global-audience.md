---
title: "What strategies would you use to improve page load time for a global audience?"
tags: ["page-load", "cdn", "code-splitting", "web-vitals", "ssr"]
difficulty: "hard"
---

## Short answer

I attack three things: **distance**, **bytes** and **render path**. Distance: serve static assets and cached HTML from a CDN edge close to users, use HTTP/2 or HTTP/3, and render at the edge or with static generation. Bytes: code-split by route, tree-shake, compress with Brotli, optimize images (AVIF/WebP, responsive sizes, lazy loading) and subset fonts. Render path: server-render or stream HTML (Next.js App Router, Server Components) so content appears before JavaScript finishes, preload the LCP image, and defer third-party scripts. I measure with real-user Web Vitals per region.

## Explanation

Serving a global audience from one server is like running a single bakery in Mumbai for customers in New York. You open local branches (CDN edges), send smaller boxes (fewer bytes), and hand over the bread before the paperwork is done (stream HTML first, hydrate later).

### Strategies by category

| Category | Techniques |
|---|---|
| Network distance | CDN for JS/CSS/images/fonts, edge caching of HTML, edge or regional servers, `preconnect` to critical origins, HTTP/3 |
| Caching | Immutable hashed filenames with `Cache-Control: max-age=31536000, immutable`, `stale-while-revalidate`, service worker for repeat visits |
| JavaScript size | Route-based `React.lazy`/dynamic imports, tree shaking, bundle analyzer, drop heavy libraries (moment.js to date-fns/Intl), Server Components ship zero JS for static parts |
| Rendering | SSG/ISR for marketing pages, SSR with streaming and `Suspense`, partial prerendering, selective hydration |
| Images | `next/image` or `srcset`, AVIF/WebP, correct dimensions to avoid CLS, `loading="lazy"` below the fold, `fetchpriority="high"` for the LCP image |
| Fonts | Self-host, subset per language, `font-display: swap`, preload the main font |
| Data | Fetch on the server near the database, parallelize requests, avoid client-side waterfalls |
| Third parties | Load analytics/chat widgets after interaction or idle, use `async`/`defer` |
| Localization | Load only the active locale's messages; split per language |

### Rendering timeline

```text
CSR only:  HTML shell -> download JS -> run JS -> fetch data -> render   (slow LCP)
SSR+stream: HTML with content (from edge) -> paint -> JS hydrates islands (fast LCP)
```

### Measure

- Field data: Core Web Vitals (LCP < 2.5s, INP < 200ms, CLS < 0.1) via the `web-vitals` library or CrUX, **segmented by country and device**.
- Lab data: Lighthouse and WebPageTest with throttling from multiple locations.
- Set performance budgets in CI.

## Example

```jsx
// Route-level code splitting with React Router
import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));

const router = createBrowserRouter([
  { path: "/", element: <Suspense fallback={<p>Loading...</p>}><Dashboard /></Suspense> },
  { path: "/reports", element: <Suspense fallback={<p>Loading...</p>}><Reports /></Suspense> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

```jsx
// Next.js App Router: static page with a prioritized hero image
import Image from "next/image";

export const revalidate = 3600; // ISR: regenerate at most once per hour, served from CDN

export default async function Home() {
  const products = await fetch("https://api.example.com/featured").then((r) => r.json());
  return (
    <main>
      <Image src="/hero.avif" alt="Sale" width={1200} height={500} priority />
      <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </main>
  );
}
```

## Common mistakes

- Testing only on a fast laptop near the server; the real problem is a mid-range phone on 4G far away.
- Shipping one giant bundle including every locale and every route.
- Lazy-loading the LCP hero image, which delays the most important paint.
- Client-side request waterfalls (fetch user, then fetch settings, then fetch data).

## Follow-up questions

- **SSR vs SSG for global users?** SSG/ISR serves cached HTML from the edge with no server work; SSR is needed for personalized or real-time pages, ideally streamed and run near the data.
- **What is TTFB and how do you lower it?** Time to first byte; lower it with CDN/edge caching, fewer redirects and faster server data access.
- **How do Server Components help load time?** Components that only render data never ship their code to the browser, shrinking the JS bundle.

## Quick recap

- Shorten distance with CDNs and edge rendering.
- Ship fewer bytes: split code, compress, optimize images and fonts.
- Send meaningful HTML early with SSR/SSG and streaming.
- Measure Web Vitals by region and enforce budgets.
