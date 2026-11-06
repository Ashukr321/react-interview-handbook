---
title: "How does React prioritize updates?"
tags: ["lanes", "scheduler", "concurrent", "internals"]
difficulty: "hard"
---

## Short answer

React gives every update a **lane**, a bit in a 31-bit bitmask that encodes priority. When scheduling, React picks the highest-priority pending lanes and renders them first. Sync and input lanes render without yielding; transition, retry and idle lanes render with time slicing and can be interrupted. The Scheduler package then runs that work in chunks so the browser can paint and handle input.

## Explanation

Analogy: a hospital emergency room. Every patient gets a triage tag (lane). The doctor always treats the most critical tag first; a minor case being treated can be paused if a critical patient arrives.

### The lane model (simplified)

| Lane | Typical source | Yields? |
|---|---|---|
| `SyncLane` | Discrete events (click, keydown), `flushSync` | No |
| `InputContinuousLane` | `mousemove`, `scroll`, drag | No |
| `DefaultLane` | `setTimeout`, network callbacks, initial `createRoot().render` | No |
| `TransitionLanes` | `startTransition`, `useDeferredValue` | Yes |
| `RetryLanes` | Re-render after a Suspense promise resolves | Yes |
| `IdleLane` | Very low priority work | Yes |
| `OffscreenLane` | Hidden trees (Activity / offscreen) | Yes |

### How a lane is chosen

```text
setState called
   |
   v
requestUpdateLane(fiber)
   |-- inside startTransition?   -> next TransitionLane
   |-- inside an event handler?  -> lane from event priority
   |-- otherwise                 -> DefaultLane
   v
markUpdateLaneFromFiberToRoot -> root.pendingLanes |= lane
   v
ensureRootIsScheduled -> getNextLanes(root) picks highest priority
   v
performSyncWorkOnRoot  OR  performConcurrentWorkOnRoot (workLoopConcurrent + shouldYield)
```

### Interruption and starvation

- If a higher-priority lane arrives during a concurrent render, React discards the work-in-progress tree and starts over with the urgent lane.
- To prevent **starvation**, each lane gets an expiration time. If a transition waits too long (around 5 seconds), it is marked expired and rendered synchronously.
- Bitmasks make it cheap to batch lanes (`a | b`) and check membership (`lanes & lane`).

## Example

```jsx
import { useState, useTransition } from "react";
import { flushSync } from "react-dom";

function Demo() {
  const [count, setCount] = useState(0);
  const [list, setList] = useState([]);
  const [, startTransition] = useTransition();

  function onClick() {
    setCount((c) => c + 1); // SyncLane (discrete event)
    startTransition(() => {
      setList(buildHugeList()); // TransitionLane, interruptible
    });
  }

  function onMeasure() {
    flushSync(() => setCount(0)); // forced synchronous commit
    // DOM is updated here, safe to measure
  }

  return (
    <>
      <button onClick={onClick}>{count}</button>
      <button onClick={onMeasure}>Reset and measure</button>
      <List items={list} />
    </>
  );
}
```

## Common mistakes

- Saying React uses `requestIdleCallback`. The Scheduler uses `MessageChannel` (with `setTimeout` fallback), not `requestIdleCallback`.
- Thinking priorities exist in legacy `ReactDOM.render` mode. Legacy roots render everything synchronously.
- Believing low-priority work can starve forever. Lanes expire.
- Confusing Scheduler priorities with lanes. Lanes are React's model; they are mapped to Scheduler priorities when a task is scheduled.

## Follow-up questions

- **Why bitmasks instead of numbers?** They let React represent sets of priorities and batch, entangle or remove lanes with fast bitwise operations.
- **What is lane entanglement?** Some lanes must render together (e.g. transitions updating the same queue), so React entangles them to avoid tearing.
- **How often does React yield?** Roughly every 5 ms frame budget in `workLoopConcurrent` via `shouldYield()`.

## Quick recap

- Every update gets a lane (bit in a bitmask).
- Highest-priority lanes render first.
- Sync/input/default render without yielding; transitions yield.
- Urgent work interrupts and restarts lower-priority renders.
- Lanes expire to prevent starvation.
