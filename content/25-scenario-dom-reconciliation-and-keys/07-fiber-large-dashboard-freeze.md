---
title: "Your application freezes while rendering a large dashboard. How can Fiber help solve this?"
tags: ["fiber", "concurrent-rendering", "time-slicing", "performance", "dashboard"]
difficulty: "hard"
---

## Short answer

The freeze happens because a big synchronous render occupies the main thread, so the browser can't handle input or paint. Fiber breaks rendering into units of work (one per component) that can be **paused, resumed, prioritized or thrown away**. You opt into that by rendering the heavy part as a non-urgent update with `startTransition` or `useDeferredValue`, and by streaming slow sections with **Suspense**. Fiber can't speed up a single slow component, though; that still needs splitting, memoization, virtualization or a worker.

## Why it happens

The old stack reconciler walked the whole tree recursively in one go and couldn't stop until it finished. React 18+ still renders **regular updates synchronously** by default. Concurrent behavior applies only to updates you mark as non-urgent.

```text
Without transition:
  [========= 900ms render, one long task =========] → paint
   clicks/typing queued, page frozen

With startTransition (Fiber time slicing):
  [5ms][paint][5ms][input!][5ms][5ms]...[commit] → paint
   urgent work interleaves; stale work can be abandoned
```

How Fiber makes this possible:

- **Fiber nodes as units of work**: React processes one Fiber at a time and checks `shouldYield()` between them.
- **Work-in-progress tree**: rendering happens off-screen, so it can be discarded without visual glitches.
- **Lanes**: urgent updates can interrupt a transition render.
- **Suspense**: parts that aren't ready show a fallback while the rest commits.

## How to fix it

1. **Profile** to find whether the cost is many components (Fiber can slice it) or one huge component (it can't).
2. **Mark heavy updates as transitions**, such as tab switches, filters and date ranges.
3. **Wrap slow widgets in Suspense** and lazy-load below-the-fold widgets.
4. **Reduce the work**: virtualize tables, downsample charts, memoize widgets (or enable the React Compiler).
5. **Offload** long pure computations to a Web Worker.

```jsx
import { lazy, Suspense, useState, useTransition } from "react";

const AnalyticsTab = lazy(() => import("./AnalyticsTab"));
const OverviewTab = lazy(() => import("./OverviewTab"));

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [isPending, startTransition] = useTransition();

  const select = (next) => startTransition(() => setTab(next));

  return (
    <>
      <nav style={{ opacity: isPending ? 0.6 : 1 }}>
        <button onClick={() => select("overview")}>Overview</button>
        <button onClick={() => select("analytics")}>Analytics</button>
      </nav>
      <Suspense fallback={<p>Loading tab…</p>}>
        {tab === "overview" ? <OverviewTab /> : <AnalyticsTab />}
      </Suspense>
    </>
  );
}
```

Clicking "Analytics" keeps the current tab visible and the buttons responsive while React renders the heavy tab in interruptible slices. Clicking back mid-render abandons the stale work.

> **⚠️ Gotcha:** Text in a controlled input must stay urgent. Don't put the input's own `setValue` in a transition; defer the expensive consumer instead.

## How to verify

- Chrome Performance panel: the single long task should become many short ones, and the "Long tasks" count should drop.
- Measure INP with the Web Vitals extension while switching tabs.
- `isPending` toggles, showing the old UI staying interactive during the transition.

## Follow-up questions

- **Does Fiber make rendering faster?** No. It makes rendering *interruptible and prioritized*; total work is similar or slightly higher.
- **Is concurrent rendering on by default?** `createRoot` enables it, but it applies only to transitions, deferred values and Suspense.
- **What can't be interrupted?** The commit phase, and the inside of one component's render.

## Quick recap

- Freezes come from long synchronous renders.
- Fiber splits rendering into pausable units with priorities (lanes).
- Opt in with `startTransition`, `useDeferredValue` and Suspense.
- Still reduce the work: virtualization, memoization, workers.
