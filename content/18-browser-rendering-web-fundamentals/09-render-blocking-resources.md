---
title: "What are render-blocking resources?"
tags: ["performance", "css", "javascript", "crp"]
difficulty: "medium"
---

## Short answer

Render-blocking resources are files the browser must download and process before it can paint the page for the first time. By default these are stylesheets in the `<head>` (CSS blocks rendering) and synchronous `<script>` tags without `async`, `defer` or `type="module"` (they block HTML parsing). Every one of them adds network round trips before First Contentful Paint, so you reduce, inline, defer or split them.

## Explanation

Imagine a stage play that cannot start until every prop truck arrives. Some trucks carry essentials (the main set), others carry decorations for act three. Render-blocking resources are trucks the director insists on waiting for; the fix is to wait only for the essentials and let the rest arrive during the show.

### What blocks and what does not

| Resource | Blocks rendering? | Blocks parsing? | Fix |
|---|---|---|---|
| `<link rel="stylesheet">` in head | Yes | No (but blocks later sync scripts) | Inline critical CSS, split by media |
| `<link rel="stylesheet" media="print">` | No | No | Use `media` for non-matching CSS |
| `<script src>` (classic, sync) | Yes (via parsing) | Yes | `defer`, `async` or move to the end |
| `<script defer>` / `type="module"` | No | No | Runs after parsing, in order |
| `<script async>` | No | Pauses briefly when it executes | For independent scripts (analytics) |
| CSS `@import` | Yes, chained | No | Use `<link>` or bundle instead |
| Web fonts | Text may be invisible (FOIT) | No | `font-display: swap`, preload |
| Images | No | No | But affect LCP; size and prioritize |

### Why CSS blocks

Without CSS, the browser would paint unstyled content and then repaint everything (a flash of unstyled content). So it waits for the CSSOM. And because a script might read styles, a synchronous script also waits for preceding CSS before running.

### How to find them

- Lighthouse "Eliminate render-blocking resources" audit.
- Chrome DevTools Network panel and the Performance panel's "Render blocking" column.
- Coverage tab to find unused CSS and JS.

### Fixes

- Inline the small critical CSS; load the rest with `media` or `preload` tricks.
- Remove unused CSS (Tailwind's build step, PurgeCSS).
- `defer` application scripts; `async` for third-party analytics.
- Code-split large JS bundles (`React.lazy`, route-level splitting).
- Self-host and preload fonts with `font-display: swap`.
- Use HTTP/2 or HTTP/3 and compression to shorten each download.

## Example

```html
<head>
  <!-- ❌ render-blocking -->
  <link rel="stylesheet" href="/all-styles.css" />
  <script src="/vendor.js"></script>

  <!-- ✅ non-blocking alternatives -->
  <style>/* critical above-the-fold CSS */</style>
  <link rel="stylesheet" href="/print.css" media="print" />
  <link rel="preload" href="/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <script src="/app.js" defer></script>
  <script src="https://analytics.example.com/a.js" async></script>
</head>
```

In a React app, split routes so the initial bundle stays small:

```jsx
import { lazy, Suspense } from "react";

const Reports = lazy(() => import("./Reports"));

export function App() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Reports />
    </Suspense>
  );
}
```

## Common mistakes

- Putting `async` on scripts that depend on each other; `async` does not preserve order, `defer` does.
- Inlining all CSS, which bloats every HTML response and prevents caching.
- Loading several Google Fonts weights synchronously from the head.
- Assuming images are render-blocking; they are not, but they often decide LCP.

## Follow-up questions

- **`async` vs `defer`?** Both download in parallel; `async` runs as soon as it arrives (any order), `defer` runs after parsing in document order, before `DOMContentLoaded`.
- **Are module scripts deferred?** Yes, `type="module"` scripts are deferred by default.
- **How does SSR relate?** SSR sends content in the HTML, but render-blocking CSS and JS in the head can still delay the first paint.

## Quick recap

- Head CSS blocks rendering; sync scripts block parsing.
- They delay First Contentful Paint.
- Inline critical CSS, defer or async JS, split bundles.
- Measure with Lighthouse and DevTools.
