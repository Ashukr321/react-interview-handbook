---
title: "A chart takes two seconds to render. How can you keep the UI interactive?"
tags: ["performance", "usetransition", "web-workers", "charts", "concurrent"]
difficulty: "hard"
---

## Short answer

First find *where* the two seconds go. If the time is spread across many React components, mark the chart update as a transition (`useTransition` / `useDeferredValue`), and React will render it in interruptible slices while the rest of the UI stays responsive. If the time is one big synchronous block, like a data crunch or a chart library drawing 100k points, no React feature can interrupt it. In that case move the computation to a **Web Worker**, downsample the data, switch to a canvas or WebGL renderer, and lazy-load the chart behind a Suspense boundary.

## Why it happens

JavaScript runs on one main thread. A two-second task blocks clicks, typing, scrolling and paint until it finishes.

```text
Case A: cost spread over many components (React can slice it)
  [Axis][Series1][Series2][Legend][Tooltip...]  → yield between Fibers ✔

Case B: cost inside one call (React cannot slice it)
  [ computeLayout(100k points) ── 1800ms ── ]   → blocks no matter what ✘
```

Concurrent rendering yields *between* components, never inside one function. Most "slow chart" problems are Case B: aggregating raw data, computing scales and paths, or a library doing synchronous SVG work.

## How to fix it

1. **Profile** with the Chrome Performance panel: is it React rendering, your data prep, or the library's draw call?
2. **Reduce the data**: aggregate on the server, or downsample (e.g. LTTB to ~1–2k points); you can't see 100k points on an 800px chart anyway.
3. **Move pure computation to a Web Worker** and render the result.
4. **Use canvas/WebGL** renderers for large series instead of thousands of SVG nodes.
5. **Mark the update as a transition** so controls stay responsive and stale renders are dropped.
6. **Lazy-load** the chart code and show a skeleton with Suspense.

```jsx
import { useEffect, useState, useTransition } from "react";

export default function RevenueChart({ rawPoints, range }) {
  const [series, setSeries] = useState(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const worker = new Worker(new URL("./downsample.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      // Rendering the result is non-urgent
      startTransition(() => setSeries(e.data));
    };
    worker.postMessage({ rawPoints, range, target: 1500 });
    return () => worker.terminate(); // drop stale work when range changes
  }, [rawPoints, range]);

  if (!series) return <div className="chart-skeleton" aria-busy="true" />;
  return (
    <div style={{ opacity: isPending ? 0.6 : 1 }}>
      <LineChart data={series} renderer="canvas" />
    </div>
  );
}
```

```js
// downsample.worker.js — runs off the main thread
self.onmessage = ({ data }) => {
  const filtered = filterByRange(data.rawPoints, data.range);
  self.postMessage(lttb(filtered, data.target));
};
```

> **💡 Interview tip:** Say it plainly: "Transitions change *priority*, not *cost*. For a single two-second task I'd move the work off the main thread or make it smaller."

## How to verify

- Performance panel: there should be no long task over 50 ms on the main thread during chart updates; the worker's time shows on its own thread.
- Click and type while the chart updates under CPU throttling; both should respond instantly.
- Track INP with the Web Vitals extension before and after.

## Follow-up questions

- **Why not `requestIdleCallback` chunking?** It works for splittable loops, but workers keep the main thread completely free and are simpler to reason about.
- **Can `OffscreenCanvas` help?** Yes. Some chart libraries can draw entirely inside a worker using `OffscreenCanvas`.
- **Would `memo` help?** It stops the chart re-rendering on *unrelated* updates, which is still worth doing, but not when its data actually changes.

## Quick recap

- Profile: many components or one big task?
- Transitions help with the first, not the second.
- Downsample, use canvas/WebGL, and offload to Web Workers.
- Lazy-load with a skeleton and keep stale content visible with `isPending`.
