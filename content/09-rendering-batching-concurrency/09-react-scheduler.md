---
title: "What is React Scheduler?"
tags: ["scheduler", "internals", "time-slicing"]
difficulty: "hard"
---

## Short answer

The Scheduler is a separate package (`scheduler`) that React uses to run work cooperatively on the main thread. It keeps a priority queue of tasks, runs them in short time slices (about 5 ms), and yields to the browser between slices so input and painting aren't blocked. React's reconciler maps update lanes to Scheduler priorities and hands it render work; the Scheduler decides **when** that work runs.

## Explanation

### Priority levels and timeouts

Each task gets an expiration time = current time + timeout for its priority. The task queue is a min-heap ordered by expiration time.

| Scheduler priority | Timeout | Used for |
|---|---|---|
| ImmediatePriority | -1 ms (already expired) | Discrete events (sync lane) |
| UserBlockingPriority | 250 ms | Continuous input (scroll, mousemove) |
| NormalPriority | 5,000 ms | Default updates, transitions, passive effects |
| LowPriority | 10,000 ms | Low-priority background work |
| IdlePriority | Never expires | Idle work |

### How it runs work

```text
scheduleCallback(priority, callback)
   -> push task into taskQueue (min-heap by expirationTime)
      (or timerQueue if delayed)
   -> requestHostCallback -> port.postMessage()  (MessageChannel)

on message (a new macrotask):
   workLoop:
     while task = peek(taskQueue):
        if task not expired AND shouldYieldToHost(): break   // > ~5ms used
        result = task.callback(didTimeout)
        if typeof result === "function": task.callback = result  // continuation
        else pop(taskQueue)
   if tasks remain -> postMessage again (yield to browser first)
```

Key details:

- **`MessageChannel`** is used instead of `setTimeout(0)` (clamped to ~4 ms when nested) and instead of `requestIdleCallback` (fires too rarely and inconsistently). In Node, `setImmediate` is used.
- **`shouldYieldToHost()`** returns true once the slice exceeds `frameInterval` (5 ms). React's `workLoopConcurrent` calls it between fibers.
- **Continuations** let React resume the same render: `performConcurrentWorkOnRoot` returns itself if work remains.
- **Expired tasks** run even if the slice is over, preventing starvation.

### Relationship with React

| Responsibility | Owner |
|---|---|
| Deciding priority of an update (lanes) | React reconciler |
| Rendering fibers, diffing, committing | React reconciler |
| Ordering tasks, time slicing, yielding to browser | Scheduler |
| Sync lane flushing | React (microtask), not a time-sliced Scheduler task |

Analogy: React is the chef who knows how to cook; the Scheduler is the expeditor who decides which order goes next and tells the chef when to step back so the waiters can get through.

## Example

```js
// Illustration only: the scheduler package is public but marked unstable.
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_shouldYield as shouldYield,
  unstable_NormalPriority as NormalPriority,
} from "scheduler";

const items = Array.from({ length: 100_000 }, (_, i) => i);
let index = 0;

function processChunk() {
  while (index < items.length && !shouldYield()) {
    heavyWork(items[index++]);
  }
  // Returning a function = continuation: Scheduler resumes later
  return index < items.length ? processChunk : null;
}

scheduleCallback(NormalPriority, processChunk);

function heavyWork(n) {
  Math.sqrt(n * Math.random());
}
```

In app code you'd use `startTransition` instead; React handles the Scheduler for you.

## Common mistakes

- Saying React uses `requestIdleCallback`. It did in early experiments, then built its own Scheduler.
- Assuming the Scheduler aligns work with animation frames. Modern versions just yield every 5 ms; the browser decides when to paint.
- Using `unstable_` Scheduler APIs in production apps; they can change without notice.

## Follow-up questions

- **Is the Scheduler React-specific?** It was designed to be generic, but in practice only React uses it.
- **What is the `timerQueue`?** Tasks scheduled with a `delay`; they move to `taskQueue` when their start time arrives.
- **Will browsers provide this natively?** `scheduler.postTask()` and `scheduler.yield()` are emerging web APIs with a similar idea.

## Quick recap

- Separate package that schedules cooperative tasks.
- Min-heap of tasks ordered by expiration time.
- Runs ~5 ms slices via `MessageChannel`, then yields.
- React maps lanes to Scheduler priorities; Scheduler decides when to run.
