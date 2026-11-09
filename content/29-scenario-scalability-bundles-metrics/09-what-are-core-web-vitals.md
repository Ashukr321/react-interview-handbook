---
title: "What are Core Web Vitals?"
tags: ["web-vitals", "lcp", "inp", "cls", "performance-metrics"]
difficulty: "medium"
---

## Short answer

Core Web Vitals are Google's three user-centered metrics for page experience: **LCP** (Largest Contentful Paint) measures loading, **INP** (Interaction to Next Paint) measures responsiveness, and **CLS** (Cumulative Layout Shift) measures visual stability. A page passes when the 75th percentile of real users gets LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1. INP replaced FID as a Core Web Vital in March 2024.

## Explanation

Each metric answers one user question:

| Metric | User question | Good | Needs improvement | Poor |
| --- | --- | --- | --- | --- |
| LCP | "Is the main content here yet?" | ≤ 2.5 s | 2.5 - 4 s | > 4 s |
| INP | "Does it react when I click or type?" | ≤ 200 ms | 200 - 500 ms | > 500 ms |
| CLS | "Does stuff jump around?" | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |

Scores are judged at the **75th percentile** of page loads, split by mobile and desktop, using field data (real users, e.g. Chrome UX Report).

### LCP: Largest Contentful Paint

Time until the largest image or text block in the viewport is rendered. Usually the hero image or main heading.

- Hurt by: slow server (TTFB), render-blocking CSS/JS, client-only rendering, lazy-loaded or unoptimized hero image.
- Fix: SSR/SSG, CDN, preload and `fetchpriority="high"` on the LCP image, modern formats, smaller JS.

### INP: Interaction to Next Paint

For clicks, taps and key presses during the whole visit, the time from input until the next frame is painted. Reported as roughly the worst interaction.

```text
input delay  ->  event handler processing  ->  presentation delay (render + paint)
```

- Hurt by: long tasks, heavy re-renders, large DOM, third-party scripts.
- Fix: break up long tasks, `useTransition`/`useDeferredValue`, memoize expensive renders, virtualize lists, move work to Web Workers.

### CLS: Cumulative Layout Shift

Score of unexpected layout movement (impact fraction x distance fraction), using the largest burst of shifts in a session window.

- Hurt by: images/ads/embeds without dimensions, late-loading fonts, banners inserted above content.
- Fix: set `width`/`height` or `aspect-ratio`, reserve space for ads, `font-display: optional` or size-adjusted fallbacks, animate with `transform`.

## Example

```jsx
// Report real-user Core Web Vitals
import { useEffect } from "react";
import { onLCP, onINP, onCLS } from "web-vitals";

export function WebVitalsReporter() {
  useEffect(() => {
    const send = (metric) =>
      navigator.sendBeacon(
        "/analytics/vitals",
        JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, page: location.pathname })
      );
    onLCP(send);
    onINP(send);
    onCLS(send);
  }, []);
  return null;
}
```

> **💡 Interview tip:** Mention lab vs field: Lighthouse cannot measure INP (no real user), so it reports TBT as a proxy. The pass/fail verdict comes from field data.

## Common mistakes

- Still naming FID as a Core Web Vital; INP replaced it in 2024.
- Optimizing only the Lighthouse score on a fast laptop instead of p75 field data on mobile.
- Lazy-loading the LCP image.
- Believing CLS only happens on load; shifts after interactions or scrolling also count (except within 500 ms of user input).

## Follow-up questions

- **What are TTFB and FCP?** Supporting metrics: time to first byte and first contentful paint; they help diagnose LCP but are not Core Web Vitals.
- **Do Core Web Vitals affect SEO?** Yes, as part of Google's page experience signals, though relevance of content matters more.
- **Where do you see field data?** PageSpeed Insights, Search Console's Core Web Vitals report, CrUX, or your own RUM.

## Quick recap

- LCP = loading (≤ 2.5 s), INP = responsiveness (≤ 200 ms), CLS = stability (≤ 0.1).
- Judged at the 75th percentile of real users.
- INP replaced FID in March 2024.
- Measure in the field with `web-vitals`, diagnose in the lab.
