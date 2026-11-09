---
title: "A page freezes while rendering a large chart. How would concurrent rendering help?"
tags: ["scenario", "concurrent-rendering", "useTransition", "performance", "web-workers"]
difficulty: "hard"
---

## Short answer

Concurrent rendering lets React render the chart as a low-priority, interruptible update (via `startTransition` or `useDeferredValue`). React works in small time slices (about 5 ms), yields to the browser between them, and abandons the work if something more urgent like a click arrives, so the page stays responsive while the old chart stays visible. It only helps with React's render work, though; heavy data crunching or canvas drawing in one synchronous call still needs downsampling, memoization or a Web Worker.

## Why it happens

An urgent update renders synchronously from start to finish. If building thousands of SVG elements takes 800 ms, the main thread is blocked for 800 ms: no clicks, no scrolling, no typing.

```text
 Sync render:        [============ 800 ms render ============] -> paint
                     clicks during this time wait

 Transition render:  [5ms][yield][5ms][yield][5ms]...  -> commit when done
                            ^ click handled here; can interrupt and restart
```

Concurrency cannot split a single long JS function. If the time goes into `computeSeries(100_000 points)` inside one component, that function still blocks; React can only yield between components.

## How to fix it

1. **Profile first**: find whether time is in React render, layout/paint or a data function.
2. **Make chart updates non-urgent**: wrap range/filter changes in `startTransition`, keeping the controls urgent.
3. **Defer the data** with `useDeferredValue` and `memo` the chart.
4. **Reduce the work**: downsample (e.g. LTTB to ~1-2k points), aggregate on the server, use canvas or WebGL instead of thousands of SVG nodes.
5. **Move heavy computation off the main thread** with a Web Worker.
6. **Lazy load** the chart library and render it below the fold with `Suspense`.

```jsx
import { lazy, memo, Suspense, useDeferredValue, useMemo, useState, useTransition } from "react";

const LineChart = lazy(() => import("./LineChart")); // heavy library in its own chunk

export function Analytics({ points }) {
  const [range, setRange] = useState("1y");
  const [isPending, startTransition] = useTransition();

  return (
    <section>
      {["1m", "6m", "1y"].map((r) => (
        <button key={r} aria-pressed={range === r} onClick={() => startTransition(() => setRange(r))}>
          {r}
        </button>
      ))}
      {isPending && <span> Updating...</span>}
      <Suspense fallback={<div className="chart-skeleton" />}>
        <Chart points={points} range={range} />
      </Suspense>
    </section>
  );
}

const Chart = memo(function Chart({ points, range }) {
  const deferredPoints = useDeferredValue(points); // new live data does not block input
  const series = useMemo(() => downsample(filterByRange(deferredPoints, range), 1500), [deferredPoints, range]);
  return <LineChart data={series} />;
});

function filterByRange(points, range) {
  const days = { "1m": 30, "6m": 182, "1y": 365 }[range];
  const from = Date.now() - days * 86_400_000;
  return points.filter((p) => p.time >= from);
}

function downsample(points, max) {
  // shortcut: simple stride sampling, switch to LTTB if peaks must be preserved
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  return points.filter((_, i) => i % step === 0);
}
```

> **💡 Interview tip:** Say clearly what concurrency does and does not solve. "It keeps the UI responsive; it does not make the chart cheaper" shows real understanding.

## How to verify

- Performance panel: with the transition, long tasks are broken into short slices; clicking during an update responds immediately.
- React DevTools Profiler shows the chart commit as a separate, lower-priority render.
- Measure INP before and after; check total chart render time after downsampling.
- Test on a throttled CPU (4x-6x slowdown) to mimic mid-range phones.

## Follow-up questions

- **Why does the old chart stay on screen?** A transition keeps showing the current UI until the new tree is ready, instead of a fallback.
- **When should you use a Web Worker?** When a single computation (parsing, aggregation) takes more than ~50 ms; post the data, get results back, then set state.
- **SVG or canvas?** SVG is easy and accessible for hundreds of elements; canvas/WebGL scales to many thousands of points.

## Quick recap

- Transitions make chart rendering interruptible and keep input responsive.
- React yields between components, not inside one long function.
- Reduce work: downsample, memoize, canvas, lazy load.
- Heavy computation belongs in a Web Worker.
