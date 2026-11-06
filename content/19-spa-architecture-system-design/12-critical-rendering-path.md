---
title: "What is the Critical Rendering Path?"
tags: ["performance", "browser", "rendering", "architecture"]
difficulty: "medium"
---

## Short answer

The Critical Rendering Path is the sequence of steps the browser must finish before it can paint the first pixels: parse HTML into the DOM, parse CSS into the CSSOM, combine them into a render tree, compute layout, paint and composite. CSS blocks rendering and synchronous scripts block parsing. Architecture choices matter most here: a client-rendered SPA paints almost nothing until its JS bundle downloads and runs, while SSR, SSG and streaming put real content into that first HTML response.

## Explanation

```text
 HTML bytes --> DOM ----\
                         >--> Render tree --> Layout --> Paint --> Composite
 CSS bytes  --> CSSOM --/          ^
                                   |
 <script> (sync) pauses HTML parsing until downloaded and executed
```

### What blocks it

- **Render-blocking CSS**: the browser will not paint until all stylesheets in the head are loaded.
- **Parser-blocking JS**: a plain script stops HTML parsing. `defer` and `type="module"` run after parsing; `async` runs as soon as it downloads.
- **Late-discovered resources**: fonts or hero images referenced only from CSS or JS are found late.

### How architecture choices affect it

| Choice | Effect on the critical path |
|---|---|
| Client-side rendering (Vite SPA) | HTML is an empty `div`; FCP/LCP waits for JS download, parse, execute and data fetch |
| SSR / streaming SSR (Next.js, React Router framework mode) | Content is in the HTML; paint happens before hydration |
| SSG / ISR | Pre-built HTML from a CDN: fastest first byte and paint |
| Server Components | Less JS shipped, so less parse and execute work before interactivity |
| Route-level code splitting | Smaller initial bundle on the path |
| Critical CSS inlined, rest deferred | Removes a render-blocking round trip |
| Preload LCP image and fonts | Discovered early instead of after CSS/JS |

Think of it as a relay race: each runner (HTML, CSS, JS, data) must hand over before the next starts. Good architecture removes runners from the first lap or lets them run in parallel.

## Example

```html
<!doctype html>
<html>
  <head>
    <style>/* inlined critical above-the-fold CSS */</style>
    <link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
    <link rel="stylesheet" href="/assets/app.3c9e.css" />
    <script type="module" src="/assets/main.8a1f.js"></script> <!-- deferred by default -->
  </head>
  <body>
    <div id="root"><!-- SSR markup here means paint before JS runs --></div>
  </body>
</html>
```

## Common mistakes

- Putting sync scripts in the head without `defer`.
- Assuming SSR solves everything: a huge hydration bundle still delays interactivity (INP).
- Loading many large CSS files for the first route.
- Lazy loading the LCP image.

## Follow-up questions

- **Which metrics reflect the CRP?** FCP and LCP mainly; TTFB is the start of the path.
- **What is reflow?** Recalculating layout after DOM or style changes; frequent forced reflows hurt runtime performance, not just initial load.
- **How do you inspect it?** Chrome DevTools Performance panel and Lighthouse "render-blocking resources" audit.

## Quick recap

- DOM + CSSOM -> render tree -> layout -> paint -> composite.
- CSS blocks rendering; sync JS blocks parsing.
- CSR delays first paint until JS runs; SSR/SSG/streaming send content early.
- Shorten the path: critical CSS, `defer`, code splitting, preloading the LCP resource.
