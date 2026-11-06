---
title: "How does React schedule work internally?"
tags: ["scheduler", "lanes", "internals", "concurrent"]
difficulty: "hard"
---

## Short answer

Every update gets a **lane** (a bit in a 31-bit bitmask) based on where it came from: a click gets SyncLane, a `startTransition` gets a TransitionLane, and so on. The update is queued on its fiber, lanes are marked up to the root, and `ensureRootIsScheduled` picks the highest-priority pending lanes. Sync work is flushed in a microtask; other work is handed to the **Scheduler** package as a task with a matching priority, which runs it in time slices via `MessageChannel`.

## Explanation

### Step by step

```text
setState(x)
  -> requestUpdateLane()        event type / transition decides the lane
  -> enqueue update on fiber hook queue
  -> markUpdateLaneFromFiberToRoot: fiber.lanes |= lane, ancestors.childLanes |= lane
  -> root.pendingLanes |= lane
  -> ensureRootIsScheduled(root)
        getNextLanes(): pick highest-priority pending lanes
        SyncLane          -> flush in a microtask (performSyncWorkOnRoot)
        other lanes       -> Scheduler.scheduleCallback(priority, performConcurrentWorkOnRoot)
  -> render phase (workLoopSync or workLoopConcurrent)
  -> commit phase
```

### Lanes (React) to Scheduler priorities

| Source of update | Lane | Scheduler priority | Time-sliced? |
|---|---|---|---|
| `flushSync`, click, keydown | SyncLane | Immediate | No |
| mousemove, scroll, drag | InputContinuousLane | UserBlocking | No |
| setTimeout, fetch callback, initial render | DefaultLane | Normal | No |
| `startTransition`, `useDeferredValue` | TransitionLanes | Normal | Yes |
| Suspense retry | RetryLanes | Normal | Yes |
| Offscreen/idle work | IdleLane | Idle | Yes |

Lanes are bitmasks so React can batch several updates (`lanes = a | b`), check inclusion cheaply (`(lanes & lane) !== 0`), and render groups of lanes together.

### The Scheduler package

- Keeps a **min-heap** `taskQueue` sorted by expiration time (start time + priority timeout: Immediate -1 ms, UserBlocking 250 ms, Normal 5 s, Low 10 s, Idle never) and a `timerQueue` for delayed tasks.
- Runs tasks in a loop inside a `MessageChannel` message (a macrotask), yielding after ~5 ms so the browser can paint.
- If a task returns a function, it's a continuation and stays in the queue.

### Preemption and starvation

If a higher-priority lane arrives during a concurrent render, React cancels the current Scheduler task, discards the WIP tree and renders the urgent lane first. Lanes that wait past their expiration are marked expired and rendered synchronously, so transitions can't starve forever.

## Example

```jsx
import { useState, startTransition } from "react";
import { flushSync } from "react-dom";

export default function Priorities() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  const onClick = () => {
    setA((n) => n + 1);                      // SyncLane (discrete event)
    startTransition(() => setB((n) => n + 1)); // TransitionLane, rendered later
    setTimeout(() => {
      flushSync(() => setA((n) => n + 1));   // forced sync render + commit
    }, 0);
  };

  return <button onClick={onClick}>a={a} b={b}</button>;
}
```

## Common mistakes

- Saying React uses `requestIdleCallback`. It uses its own Scheduler with `MessageChannel` (and `setImmediate` in Node).
- Assuming every update goes through Scheduler time slicing. SyncLane is flushed in a microtask without slicing.
- Confusing lanes (React reconciler) with Scheduler priorities (separate package). React maps one to the other.

## Follow-up questions

- **Why bitmasks instead of numeric priorities?** They represent sets of updates, so React can batch, entangle and compare lanes with single bitwise operations.
- **What is lane entanglement?** Linking lanes so they must render together, e.g. multiple transitions updating the same `useTransition` state.
- **Can I use Scheduler directly?** It's published as `scheduler` but marked unstable; treat it as internal.

## Quick recap

- Updates get lanes based on their source.
- Lanes bubble to the root; the highest-priority set is rendered next.
- Sync lanes flush in a microtask; others go through Scheduler.
- Scheduler uses a min-heap and `MessageChannel` with 5 ms slices.
- Expired lanes prevent starvation.
