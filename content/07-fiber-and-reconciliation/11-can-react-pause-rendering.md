---
title: "Can React pause rendering? How?"
tags: ["fiber", "time-slicing", "scheduler", "concurrent"]
difficulty: "hard"
---

## Short answer

Yes, but only during the render phase and only for non-blocking updates (transitions, deferred values, Suspense retries). React's concurrent work loop processes one fiber at a time and checks `shouldYield()` between fibers. If its ~5 ms time slice is used up, it stops, keeps a pointer to the next fiber, and schedules a continuation via the Scheduler so the browser can paint and handle input. The commit phase is never paused.

## Explanation

### The two work loops

```js
// Blocking lanes (Sync, InputContinuous, Default): run to completion
function workLoopSync() {
  while (workInProgress !== null) performUnitOfWork(workInProgress);
}

// Non-blocking lanes (Transition, Retry, Idle): yield cooperatively
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) performUnitOfWork(workInProgress);
}
```

`performUnitOfWork` runs `beginWork` on one fiber, then moves to its child, or `completeWork` and moves to its sibling or parent.

### How the pause works

1. React stores progress in module-level variables: `workInProgressRoot`, `workInProgress` (the next fiber) and the render lanes.
2. `shouldYield()` (Scheduler's `shouldYieldToHost`) returns true once the current slice exceeds `frameInterval` (5 ms by default).
3. The loop exits. The Scheduler task returns a continuation function, so the same task resumes later.
4. The Scheduler posts a new macrotask through `MessageChannel`, letting the browser paint and run event handlers in between.

### Pause, resume, or restart?

| Situation on resume | What React does |
|---|---|
| Nothing new happened | Continue from the saved `workInProgress` fiber |
| Higher-priority update arrived (e.g. a click) | Abandon the WIP tree, render the urgent lane, then restart the lower one |
| Same-lane update arrived | Usually restart from the root with the new state |
| Lane waited too long (starvation) | Mark it expired; it renders synchronously |

Since fibers live on the heap, not the call stack, "pausing" is just returning from a function while keeping a pointer.

## Example

```jsx
import { useState, useTransition } from "react";

export default function Tabs() {
  const [tab, setTab] = useState("home");
  const [isPending, startTransition] = useTransition();

  const select = (next) => startTransition(() => setTab(next)); // pausable render

  return (
    <>
      <nav style={{ opacity: isPending ? 0.6 : 1 }}>
        <button onClick={() => select("home")}>Home</button>
        <button onClick={() => select("reports")}>Reports</button>
      </nav>
      {tab === "reports" ? <HeavyReports /> : <Home />}
    </>
  );
}

function Home() { return <p>Welcome</p>; }

function HeavyReports() {
  const rows = Array.from({ length: 2000 }, (_, i) => <SlowRow key={i} i={i} />);
  return <ul>{rows}</ul>;
}

function SlowRow({ i }) {
  const end = performance.now() + 0.5; // simulate 0.5ms of work per row
  while (performance.now() < end) {}
  return <li>Row {i}</li>;
}
```

React yields between `SlowRow` fibers, so clicking "Home" mid-render stays responsive.

## Common mistakes

- Thinking React can pause inside a single component. It yields only **between** fibers; one slow component still blocks.
- Expecting a plain `setState` from a click to be pausable. Discrete events use SyncLane and the sync loop.
- Believing `createRoot` alone makes everything time-sliced. You need transitions, `useDeferredValue` or Suspense.

## Follow-up questions

- **Why 5 ms?** It's short enough to keep frames smooth and leaves room for browser work; the Scheduler doesn't try to align with vsync.
- **Why `MessageChannel` and not `setTimeout(0)`?** Nested `setTimeout` is clamped to ~4 ms; `MessageChannel` fires sooner as a macrotask.
- **Can the commit be paused?** No. It runs synchronously so the DOM is never half-updated.

## Quick recap

- Pausing happens in the render phase, between fibers.
- `workLoopConcurrent` checks `shouldYield()` every unit.
- Progress is kept in `workInProgress`; Scheduler continues it later.
- Urgent updates can abandon and restart lower-priority renders.
