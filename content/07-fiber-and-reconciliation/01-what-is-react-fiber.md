---
title: "What is React Fiber?"
tags: ["fiber", "internals", "reconciliation"]
difficulty: "medium"
---

## Short answer

React Fiber is the reconciliation engine React has used since React 16. It re-implements rendering as a linked tree of "fiber" objects, where each fiber is a unit of work. Because work is split into small units instead of one deep recursive call, React can pause, resume, prioritize and throw away rendering work, which is what makes concurrent features like transitions and Suspense possible.

## Explanation

Before React 16, the "stack reconciler" walked the component tree recursively. Once it started, it had to finish: the JavaScript call stack held the progress, and you cannot pause a call stack halfway.

Fiber replaces the call stack with a data structure React controls. Each component instance, host element (`div`, `span`) and text node gets a **fiber node**: a plain JS object that stores its type, props, state, pointers to its parent/child/sibling, and flags describing what needs to change in the DOM.

Think of it like a to-do list versus a phone call. A phone call (recursion) must run until it ends. A to-do list (fibers) can be worked through one item at a time, set down when something urgent comes in, and picked up later.

### Key ideas

| Concept | What it means |
|---|---|
| Fiber node | One unit of work, roughly one per element in the tree |
| `current` tree | The fibers that represent what is on screen right now |
| `workInProgress` tree | The fibers being built for the next update |
| `alternate` | Pointer linking a current fiber to its work-in-progress twin (double buffering) |
| Lanes | Bitmask priorities attached to updates and fibers |
| Render / commit | Interruptible diffing phase, then a synchronous DOM-mutation phase |

### What Fiber enables

- **Time slicing**: render a few fibers, yield to the browser, continue.
- **Priorities**: a click update (SyncLane) can preempt a transition (TransitionLane).
- **Suspense**: a fiber can "suspend" and React can show a fallback and retry later.
- **Error boundaries** and returning arrays/fragments/strings from components.

```text
setState -> schedule update (lane) -> render phase: walk fibers, build workInProgress
         -> commit phase: apply DOM changes, swap root.current to the new tree
```

## Example

```jsx
import { useState, useTransition } from "react";

export default function Search({ items }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value); // urgent: SyncLane
          startTransition(() => setFilter(e.target.value)); // interruptible: TransitionLane
        }}
      />
      {isPending && <p>Updating…</p>}
      <ul>
        {items.filter((i) => i.includes(filter)).map((i) => <li key={i}>{i}</li>)}
      </ul>
    </>
  );
}
```

This only works because Fiber can abandon a half-finished transition render when a new keystroke arrives.

## Common mistakes

- Saying Fiber is "the Virtual DOM". React elements are the description; fibers are the mutable work units React builds from them.
- Claiming Fiber makes React multithreaded. It still runs on the main thread; it just yields cooperatively.
- Thinking every update is time-sliced. In React 18+, only non-blocking lanes (transitions, retries, idle) use the interruptible work loop.

## Follow-up questions

- **Is Fiber something I use directly?** No. It is an internal implementation detail of `react-reconciler`; you interact with it indirectly through APIs like `useTransition`.
- **When did Fiber ship?** React 16 (2017). Concurrent features built on it became stable with `createRoot` in React 18.
- **Does React Native use Fiber too?** Yes. The reconciler is shared; only the host config (DOM vs native views) differs.

## Quick recap

- Fiber is React's reconciler since v16, built on a linked tree of fiber objects.
- Each fiber is a resumable unit of work.
- React keeps a `current` tree and a `workInProgress` tree linked via `alternate`.
- It enables pausing, prioritizing (lanes), Suspense and concurrent rendering.
