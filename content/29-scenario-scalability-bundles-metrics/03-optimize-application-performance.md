---
title: "How do you optimize performance of an application?"
tags: ["performance", "optimization", "web-vitals", "react"]
difficulty: "medium"
---

## Short answer

I start by measuring (Lighthouse, Chrome Performance panel, React Profiler, real-user Web Vitals) to find the actual bottleneck. Then I optimize in layers: load less (code splitting, tree shaking, image optimization), load faster (CDN, caching, compression, SSR/streaming), render less (avoid unnecessary re-renders, virtualize lists), and keep the main thread free (defer work, Web Workers, transitions). I re-measure after every change and add budgets in CI.

## Why it happens

Performance problems come from a few places:

```text
Network      -> big bundles, unoptimized images, waterfalls, no caching
Main thread  -> heavy JS, long tasks, expensive renders
Rendering    -> too many re-renders, huge DOM, layout thrashing
Perceived    -> blank screens, layout shifts, no feedback
```

Guessing leads to wasted work like memoizing cheap components while a 3 MB bundle is the real issue.

## How to fix it

### 1. Measure

| Tool | Tells you |
| --- | --- |
| Lighthouse / PageSpeed Insights | Lab LCP, TBT, CLS, opportunities |
| Network tab | Sizes, waterfalls, caching |
| Performance panel | Long tasks, layout, paint |
| React Profiler | Component renders and causes |
| RUM (`web-vitals`) | Real-user LCP, INP, CLS |

### 2. Loading

- Route-based code splitting with `React.lazy` / dynamic `import()`.
- Tree shaking, removing heavy libraries, analyzing the bundle.
- Modern image formats (AVIF/WebP), `srcset`, width/height, lazy-loading below the fold, `fetchpriority="high"` for the LCP image.
- SSR/SSG or Server Components with streaming; CDN with long-lived caching of hashed assets; Brotli.
- Parallel data fetching and prefetching on hover.

### 3. Rendering

```jsx
function ProductsPage({ products }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const visible = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(deferred.toLowerCase())),
    [products, deferred]
  );
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <VirtualizedGrid items={visible} />
    </>
  );
}
```

- Colocate state; split contexts; `memo` for expensive components (or the React Compiler).
- Virtualize long lists; keep the DOM small.

### 4. Main thread and perceived performance

- Break long tasks, move heavy work to Web Workers, load third-party scripts after interaction.
- Skeletons instead of spinners, reserve space for images and ads (no CLS), optimistic UI with `useOptimistic`.

### 5. Prevent regressions

Performance budgets (`size-limit`, Lighthouse CI) on every PR and Web Vitals dashboards per release.

> **💡 Interview tip:** Structure the answer as "measure, then load, render, main thread, then guard". It shows a method, not a list of tricks.

## How to verify

- Before/after Lighthouse runs and traces with the same throttling.
- Field p75 LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- Bundle size and Lighthouse budgets pass in CI.

## Follow-up questions

- **What is the first thing you check?** The biggest item in Lighthouse and the Network waterfall, usually JS size or the LCP image.
- **How do you optimize perceived performance?** Show content progressively: skeletons, streaming, optimistic updates and stable layouts.
- **Is memoization always good?** No; it costs memory and comparisons and only pays off for expensive renders.

## Quick recap

- Measure first, with lab and field data.
- Load less and faster: splitting, images, caching, SSR.
- Render less: state colocation, memo, virtualization.
- Keep the main thread free and guard with budgets.
