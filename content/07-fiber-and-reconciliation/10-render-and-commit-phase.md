---
title: "What is the Render phase and Commit phase?"
tags: ["render-phase", "commit-phase", "fiber", "effects"]
difficulty: "medium"
---

## Short answer

The **render phase** is where React calls your components and reconciles the result into a `workInProgress` fiber tree, marking what needs to change. It is pure, has no visible side effects, and can be paused, restarted or discarded. The **commit phase** applies those changes to the DOM, swaps `root.current` to the finished tree, and runs layout effects. It is synchronous and cannot be interrupted, so users never see a half-applied update.

## Explanation

### Render phase

- Walks fibers with `beginWork` (call component, reconcile children) and `completeWork` (create/prepare DOM nodes, diff host props).
- Sets flags like `Placement`, `Update`, `ChildDeletion` on fibers, bubbled up via `subtreeFlags`.
- Can run in `workLoopSync` or the yielding `workLoopConcurrent`.
- May run more than once per commit (interrupted, restarted, StrictMode double-invoke in dev).

### Commit phase sub-steps

```text
commitRoot
 ├─ before mutation   getSnapshotBeforeUpdate (read DOM before changes)
 ├─ mutation          DOM inserts/updates/deletes, detach refs,
 │                    useInsertionEffect, layout-effect cleanups
 ├─ root.current = finishedWork   (the trees swap here)
 ├─ layout            useLayoutEffect, componentDidMount/Update, attach refs
 └─ (after paint)     useEffect cleanups + setups (passive effects)
```

`useEffect` callbacks are scheduled to run after the browser paints, though React flushes them synchronously before paint when the update came from a discrete input such as a click.

### Comparison

| | Render phase | Commit phase |
|---|---|---|
| Work done | Call components, diff, mark flags | Mutate DOM, run lifecycle/effects |
| Side effects allowed | No | Yes |
| Interruptible | Yes (concurrent lanes) | No |
| Can run multiple times | Yes | Once per update |
| Hooks/lifecycles | Component body, `useMemo`, `useState` initializers | `useLayoutEffect`, `useEffect`, refs |

Analogy: render phase is drafting an edit in a document's "suggestion mode"; commit is clicking "accept all" in one go.

## Example

```jsx
import { useState, useEffect, useLayoutEffect, useRef } from "react";

export default function Tooltip({ text }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  // Render phase: must be pure. No DOM reads, no subscriptions here.
  const label = text.toUpperCase();

  // Commit (layout): DOM is updated but not yet painted. Safe to measure.
  useLayoutEffect(() => {
    setHeight(ref.current.getBoundingClientRect().height);
  }, [label]);

  // After paint: subscriptions, logging, network.
  useEffect(() => {
    console.log("tooltip shown", label);
  }, [label]);

  return <div ref={ref}>{label} ({height}px)</div>;
}
```

## Common mistakes

- Doing side effects (fetching, mutating globals, logging analytics) in the component body. Render can be repeated or thrown away.
- Measuring the DOM in `useEffect`, causing a visible flicker. Use `useLayoutEffect` for measurements that affect layout.
- Assuming `useEffect` runs before paint.

## Follow-up questions

- **Why must the render phase be pure?** Because concurrent rendering may discard or restart it; side effects would run for UI that never appears.
- **When are refs attached?** In the layout sub-phase of commit, so they are available in `useLayoutEffect` and `useEffect`.
- **Where does setState inside `useLayoutEffect` go?** It's processed synchronously before the browser paints.

## Quick recap

- Render: pure, interruptible, builds workInProgress tree and flags.
- Commit: synchronous, mutates DOM, swaps trees, runs layout effects.
- Passive effects (`useEffect`) run after paint.
- Keep side effects out of render.
