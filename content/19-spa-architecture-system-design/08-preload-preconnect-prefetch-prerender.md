---
title: "What are preload, preconnect, prefetch, and prerender?"
tags: ["performance", "resource-hints", "browser", "network"]
difficulty: "medium"
---

## Short answer

They are resource hints that tell the browser about work it can start early. **preconnect** opens the connection (DNS, TCP, TLS) to another origin; **preload** fetches a resource the current page will need soon at high priority; **prefetch** fetches a resource for a likely next navigation at low priority; **prerender** loads and renders a whole next page in the background so navigation is instant (today done with the Speculation Rules API).

## Explanation

Think of a dinner party. Preconnect is unlocking the front door before guests arrive. Preload is putting the main dish in the oven now because it is needed this evening. Prefetch is buying dessert for tomorrow if you have time. Prerender is setting tomorrow's whole table tonight.

| Hint | Scope | Priority | Typical use |
|---|---|---|---|
| `dns-prefetch` | Next connection | Low | Third-party origins, cheap fallback for preconnect |
| `preconnect` | Current page | High | Font CDN, API origin, image CDN |
| `preload` | Current page | High (by `as` type) | LCP hero image, web fonts, critical CSS |
| `modulepreload` | Current page | High | JS modules and their dependencies |
| `prefetch` | Next navigation | Lowest, idle time | Next route's JS chunk |
| `prerender` (Speculation Rules) | Next navigation | Uses memory and CPU | Very likely next page, like product to checkout |

The old `<link rel="prerender">` is deprecated; Chromium now uses `<script type="speculationrules">` for prefetch and prerender.

## Example

```html
<head>
  <!-- Open connections early -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://analytics.example.com" />

  <!-- Needed for this page: fetch now -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />

  <!-- Probably needed on the next page -->
  <link rel="prefetch" href="/assets/checkout.4f2a.js" />

  <!-- Prerender likely next pages -->
  <script type="speculationrules">
    { "prerender": [{ "where": { "href_matches": "/products/*" }, "eagerness": "moderate" }] }
  </script>
</head>
```

React 19 exposes the same hints as functions, and deduplicates them into the document head:

```jsx
import { preconnect, prefetchDNS, preload, preinit } from "react-dom";

function ProductPage() {
  preconnect("https://cdn.example.com");
  prefetchDNS("https://analytics.example.com");
  preload("/fonts/inter.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preinit("/widgets/reviews.js", { as: "script" }); // fetch and execute
  return <h1>Product</h1>;
}
```

Frameworks also prefetch for you: Next.js `<Link>` prefetches routes in the viewport, and React Router's `<Link prefetch="intent">` (framework mode) prefetches on hover.

## Common mistakes

- Preloading too many files; everything becomes high priority and competes with the real critical resources.
- Preloading fonts without `crossorigin`, which causes a second download.
- Preconnecting to many origins; each connection costs CPU and is closed if unused within about 10 seconds.
- Prerendering pages with side effects (analytics, "mark as read") without handling the prerendering state.

## Follow-up questions

- **How do you find what to preload?** Look at the LCP element and late-discovered resources in Lighthouse or the Performance panel's request waterfall.
- **What is `fetchpriority`?** An attribute (`high`/`low`/`auto`) that adjusts one resource's priority, e.g. the hero image.
- **Prefetch vs preload in one line?** Preload is for this page now; prefetch is for a future page later.

## Quick recap

- preconnect: warm up the connection to an origin.
- preload: fetch a current-page resource early at high priority.
- prefetch: fetch next-page resources when idle.
- prerender: render the next page in advance (Speculation Rules).
- React 19 offers `preconnect`, `prefetchDNS`, `preload`, `preinit`.
