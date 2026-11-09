---
title: "How does React avoid blocking the main thread?"
tags: ["performance", "concurrent", "scheduler", "main-thread"]
difficulty: "hard"
---

## Short answer

React avoids blocking the main thread by splitting rendering into small units of work (fibers) and, for non-urgent updates, rendering them in ~5 ms slices, yielding to the browser between slices through its Scheduler. It also prioritizes updates with lanes so urgent input is handled first, batches updates into fewer renders, defers `useEffect` work until after paint, and lets Suspense and streaming SSR break loading and hydration into pieces. React can't split work inside a single component, though, so heavy computation still needs your help.

## Explanation

### Techniques React uses

| Technique | How it frees the main thread |
|---|---|
| Fiber units of work | Render progress is resumable, not tied to the call stack |
| Time slicing | `workLoopConcurrent` yields when `shouldYield()` is true (~5 ms) |
| Scheduler with `MessageChannel` | Continuation runs as a new macrotask, letting input and paint run first |
| Lanes / priorities | Urgent updates preempt background renders |
| Automatic batching | Many updates → one render and commit |
| Passive effects after paint | `useEffect` runs after the browser paints the commit |
| Suspense | Loading parts don't block the rest of the tree |
| Streaming SSR + selective hydration | HTML streams in; hydration happens per Suspense boundary, prioritizing clicked areas |

```text
main thread with transition:
| input handler | React render 5ms | paint | React render 5ms | keypress handler | urgent commit | React restart... | commit | paint |
```

Analogy: a single-lane road with a traffic officer. Long trucks (background renders) are split into short convoys, and the officer lets ambulances (user input) pass between convoys.

### What you still have to do

React yields only between fibers, so:

- **Expensive component bodies**: memoize (`useMemo`, React Compiler), or split the computation.
- **CPU-heavy logic**: move it to a Web Worker.
- **Huge lists**: virtualize, so there are fewer fibers and DOM nodes.
- **Big bundles**: code-split with `lazy` and Suspense.
- **Slow effects**: avoid long synchronous work in `useLayoutEffect`, which blocks paint.

## Example

```jsx
import { useState, useMemo, useTransition, lazy, Suspense } from "react";

const Chart = lazy(() => import("./Chart")); // code-split: smaller initial JS

export default function Analytics({ rawData }) {
  const [range, setRange] = useState("7d");
  const [isPending, startTransition] = useTransition();

  // Heavy but memoized: recalculated only when inputs change
  const series = useMemo(() => aggregate(rawData, range), [rawData, range]);

  return (
    <>
      <select
        value={range}
        onChange={(e) => startTransition(() => setRange(e.target.value))} // time-sliced
      >
        <option value="7d">7 days</option>
        <option value="1y">1 year</option>
      </select>
      {isPending && <span>Recalculating…</span>}
      <Suspense fallback={<p>Loading chart…</p>}>
        <Chart series={series} />
      </Suspense>
    </>
  );
}

function aggregate(data, range) {
  const days = range === "7d" ? 7 : 365;
  return data.slice(-days).map((d) => ({ x: d.date, y: d.value }));
}
```

> **⚠️ Gotcha:** `useMemo` runs during render. If `aggregate` takes 200 ms, it still blocks for 200 ms, transition or not. Move work that heavy to a worker or the server.

## Common mistakes

- Believing React time-slices every update. Only transition, retry and idle lanes are sliced; sync and default updates run to completion.
- Doing long synchronous work in `useLayoutEffect`, which delays paint.
- Assuming React can yield inside a slow component function.

## Follow-up questions

- **How do you measure main-thread blocking?** Chrome Performance panel "Long tasks" (over 50 ms), the INP metric, and React DevTools Profiler.
- **Does `useEffect` block painting?** Usually not: React schedules passive effects to run after paint. The exception is an update from discrete input (like a click), where React 18+ flushes the effects synchronously at the end of the commit, so keep them light.
- **Where does React Server Components help?** Rendering and data work happen on the server, sending less JS and computation to the client.

## Quick recap

- Fibers + time slicing + Scheduler = yield every ~5 ms.
- Lanes let urgent input preempt background renders.
- Batching, deferred effects, Suspense and streaming reduce blocking.
- Heavy work inside one component still needs memoization, workers or virtualization.
