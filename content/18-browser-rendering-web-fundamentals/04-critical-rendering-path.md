---
title: "What is Critical Rendering Path (CRP)?"
asked_as: ["What is CRP (Critical Rendering Path)?"]
tags: ["browser", "rendering", "performance", "crp"]
difficulty: "medium"
---

## Short answer

The Critical Rendering Path is the sequence of steps the browser must complete to turn HTML, CSS and JavaScript into pixels on screen for the first render: parse HTML into the DOM, parse CSS into the CSSOM, run blocking scripts, combine DOM and CSSOM into the render tree, compute layout, paint, and composite. Optimizing the CRP means reducing the number, size and round trips of the resources that block that first paint.

## Explanation

Think of building a house before guests arrive. You need the floor plan (DOM) and the paint and furniture spec (CSSOM) before you can arrange the rooms (layout) and decorate (paint). Anything that makes the builders stop and wait, like a slow delivery of the furniture spec, delays the guests.

### The steps

```text
HTML ──parse──> DOM ─────────┐
                             ├──> Render tree ──> Layout ──> Paint ──> Composite
CSS  ──parse──> CSSOM ───────┘        (visible nodes only)  (geometry)  (pixels)  (layers on GPU)
        ▲
JS ─────┘ can read/modify both; parser-blocking scripts pause DOM building
```

| Step | What happens |
|---|---|
| DOM | HTML tokenized and built into a node tree, incrementally as bytes arrive |
| CSSOM | All CSS parsed into style rules; render-blocking because styles cascade |
| JavaScript | Classic `<script>` pauses parsing and waits for pending CSS before running |
| Render tree | Visible nodes with computed styles (`display: none` excluded) |
| Layout (reflow) | Calculates size and position of every box |
| Paint | Fills in pixels: text, colors, borders, images |
| Composite | Layers combined in the right order, often on the GPU |

### Critical metrics

- **Critical resources**: resources that block first render (CSS in head, sync scripts).
- **Critical path length**: number of round trips needed to fetch them.
- **Critical bytes**: total size of those resources.

### How to optimize

- Inline critical above-the-fold CSS; load the rest asynchronously.
- Use `defer` or `type="module"` for scripts; `async` for independent ones.
- Minify and compress (Brotli), and code-split JS bundles.
- `preload` key fonts and the LCP image; `preconnect` to critical origins.
- Reduce HTML size and DOM depth; use SSR or SSG so the first HTML has content.
- Avoid `@import` in CSS, which creates request chains.

## Example

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://cdn.example.com" />
    <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
    <style>
      /* critical CSS: just enough for the above-the-fold layout */
      header { height: 64px; background: #111; color: #fff; }
    </style>
    <link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'" />
    <script src="/app.js" defer></script>
  </head>
  <body>
    <header>Shop</header>
    <img src="/hero.webp" alt="Summer sale" fetchpriority="high" width="1200" height="600" />
  </body>
</html>
```

## Common mistakes

- Thinking JS is the only blocker; CSS blocks rendering and also delays script execution.
- Putting large synchronous `<script>` tags in the `<head>`.
- Lazy-loading the hero (LCP) image, which delays the most important paint.
- Confusing the CRP (first render) with re-renders caused by later layout thrashing.

## Follow-up questions

- **Is the DOM built all at once?** No, it is built incrementally, and the preload scanner fetches resources ahead of the parser.
- **How do you measure the CRP?** Chrome DevTools Performance and Network panels, Lighthouse, and metrics like FCP and LCP.
- **What triggers layout again later?** Changing geometry (width, top, font size) or reading layout values like `offsetHeight` after writes; prefer `transform` and `opacity` for animations.

## Quick recap

- CRP: DOM + CSSOM → render tree → layout → paint → composite.
- CSS is render-blocking; sync JS is parser-blocking.
- Minimize critical resources, bytes and round trips.
- Inline critical CSS, defer JS, preload key assets.
