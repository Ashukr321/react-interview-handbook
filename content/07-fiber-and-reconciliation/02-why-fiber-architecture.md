---
title: "Why did React introduce the Fiber architecture?"
tags: ["fiber", "internals", "performance"]
difficulty: "medium"
---

## Short answer

The old stack reconciler rendered recursively and synchronously, so a large update blocked the main thread until it finished, causing dropped frames and laggy input. Fiber was introduced to make rendering **incremental**: split work into units, assign priorities, pause for urgent work, and resume or discard later. It also cleaned up long-standing limitations like no fragments and no error boundaries.

## Explanation

### The problem with the stack reconciler

- Rendering was one deep recursive function call per tree. JavaScript cannot suspend a call stack, so the work was all-or-nothing.
- A big update (say 5,000 list rows) might take 100 ms. The browser targets one frame every ~16 ms at 60 fps, so typing, animations and scrolling froze.
- All updates had the same priority. A keystroke waited behind a slow data render.

Analogy: a chef who must finish an entire 10-course order before glancing at a new ticket, even if the new ticket is just "a glass of water".

### What Fiber changed

| Goal | How Fiber achieves it |
|---|---|
| Pause and resume work | Work lives in a heap-allocated linked tree, not on the call stack |
| Prioritize updates | Each update gets a lane (Sync, InputContinuous, Default, Transition, Idle…) |
| Reuse or discard work | Double-buffered `current` / `workInProgress` trees; WIP can be thrown away safely |
| Keep the UI consistent | Render phase is side-effect free; DOM changes happen only in a single synchronous commit |
| New features | Fragments, arrays/strings from render, error boundaries, portals, Suspense |

### Why the render/commit split matters

Because nothing visible happens in the render phase, React can stop halfway without the user seeing a half-updated UI. Only the commit phase touches the DOM, and it always runs to completion.

```text
Stack reconciler:  [=============== one blocking task ===============] -> paint
Fiber (concurrent): [work 5ms] yield [work 5ms] yield (handle click) [work 5ms] -> commit -> paint
```

## Example

```jsx
import { useDeferredValue, memo } from "react";

const SlowList = memo(function SlowList({ text }) {
  const rows = [];
  for (let i = 0; i < 3000; i++) rows.push(<li key={i}>{text} #{i}</li>);
  return <ul>{rows}</ul>;
});

export default function App({ text }) {
  // The deferred render runs in a transition lane and can be interrupted
  // by new keystrokes, something the stack reconciler could never do.
  const deferredText = useDeferredValue(text);
  return <SlowList text={deferredText} />;
}
```

## Common mistakes

- Saying Fiber was mainly about raw speed. Total work is similar; the win is **responsiveness** and scheduling.
- Assuming Fiber's benefits are automatic for all updates. You opt into interruptible rendering via transitions, `useDeferredValue` and Suspense.
- Confusing Fiber (2017, React 16) with concurrent mode becoming stable (React 18, `createRoot`).

## Follow-up questions

- **Why not just use Web Workers?** Components need the DOM and shared JS state; moving them off-thread would require serialization and break the programming model.
- **Why not use `requestIdleCallback`?** It fires too rarely and inconsistently across browsers, so React built its own Scheduler on `MessageChannel`.
- **What was React's motto for this?** Roughly: "push-based is hard, so let React pull and schedule work" — the framework, not the app, decides when to compute.

## Quick recap

- Stack reconciler = recursive, synchronous, unpausable.
- Fiber = linked units of work that can pause, resume, prioritize and abort.
- Render phase is pure and interruptible; commit phase is synchronous.
- It unlocked concurrent rendering, Suspense, error boundaries and fragments.
