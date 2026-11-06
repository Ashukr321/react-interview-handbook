---
title: "A dashboard contains many charts. Which optimization techniques would you apply?"
tags: ["performance", "dashboard", "react-memo", "virtualization", "concurrent"]
difficulty: "hard"
---

## Short answer

Isolate each chart so an update to one doesn't re-render the others: colocate state, memoize chart components and their data, and subscribe each widget only to the slice of state it needs. Then cut the work itself (downsample data, use canvas for big series, lazy-load off-screen charts), and keep interactions responsive with transitions and per-widget Suspense boundaries.

## Why it happens

Dashboards usually keep filters, date ranges and data in one big parent or context. Changing a single dropdown re-renders the entire tree, and every chart library recalculates scales, paths and the DOM or SVG for thousands of points. SVG charts with 10k+ nodes are expensive to diff *and* to paint.

```text
<Dashboard state={filters, data, hover}>   ← one change here
   ├─ <RevenueChart>   re-renders
   ├─ <UsersChart>     re-renders
   ├─ <MapWidget>      re-renders
   └─ ... 20 more      re-render
```

## How to fix it

| Technique | What it solves |
| --- | --- |
| Colocate state (hover/tooltip inside the chart) | Local interactions stop re-rendering the page |
| `memo` + stable `data`/`options` props | Unchanged charts skip rendering |
| Selector-based stores (Zustand, Redux `useSelector`) or split contexts | Each widget subscribes to only its slice |
| Downsample / aggregate data (e.g. LTTB, server-side buckets) | Fewer points to compute and paint |
| Canvas/WebGL renderers for large series | Avoids thousands of SVG DOM nodes |
| Lazy-load charts below the fold (`lazy` + IntersectionObserver) | Smaller bundle, less initial work |
| `useTransition` for filter changes | Inputs stay responsive while charts re-render |
| Suspense boundary per widget | Slow widgets don't block fast ones |
| Debounce resize/brush events | Avoids render storms |

```jsx
import { memo, useMemo, useTransition, useState } from "react";

const RevenueChart = memo(function RevenueChart({ points }) {
  return <LineChart data={points} renderer="canvas" />;
});

export default function Dashboard({ raw }) {
  const [range, setRange] = useState("30d");
  const [isPending, startTransition] = useTransition();

  const revenue = useMemo(
    () => downsample(filterByRange(raw.revenue, range), 500),
    [raw.revenue, range]
  );

  return (
    <>
      <select
        value={range}
        onChange={(e) => startTransition(() => setRange(e.target.value))}
      >
        <option value="7d">7 days</option>
        <option value="30d">30 days</option>
      </select>
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <RevenueChart points={revenue} />
      </div>
    </>
  );
}
```

> **💡 Interview tip:** Enabling the **React Compiler** handles the `memo`/`useMemo` layer automatically. Your remaining job is architecture: state placement, data volume and render technology.

## How to verify

- React DevTools Profiler: changing one widget's filter should highlight only that widget.
- Chrome Performance panel with 4x CPU throttling: there should be no long tasks over 50 ms during interactions; check INP in the Web Vitals extension.
- Count DOM nodes (`document.querySelectorAll("*").length`) before and after switching to canvas.

## Follow-up questions

- **Why canvas over SVG for big datasets?** Canvas draws pixels with no per-point DOM nodes, so there's nothing for React or the browser to diff or lay out.
- **Would context alone work?** One big context re-renders every consumer on any change. Split it, or use a store with selectors.
- **What about real-time updates?** Throttle incoming data to animation frames and batch the updates.

## Quick recap

- Isolate widgets: colocated state, memoized props, sliced subscriptions.
- Reduce data and DOM: downsample, canvas, lazy-load.
- Keep it responsive: transitions and per-widget Suspense.
- Verify with the Profiler and INP under CPU throttling.
