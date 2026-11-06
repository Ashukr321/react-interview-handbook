---
title: "A state update doesn't change the UI. Will React still perform reconciliation?"
tags: ["bail-out", "object-is", "usestate", "reconciliation"]
difficulty: "hard"
---

## Short answer

If the new state is identical to the current state by `Object.is`, React **bails out**: it doesn't re-render the children and doesn't touch the DOM. Sometimes React still has to call the component function once more before it can confirm the bail-out (the "one extra render" caveat), but it throws that result away and doesn't reconcile the subtree. If the state *is* a new value but produces the same output, React renders and reconciles, then finds nothing to commit.

## Why it happens

### Case 1: same value (`Object.is` equal)

```jsx
setCount(5);           // count is already 5 → bail-out
setUser(user);         // same reference → bail-out
setUser({ ...user });  // new object → NOT a bail-out, full render
```

There are two paths:

- **Eager bail-out.** If the component has no other pending updates, React compares the new value immediately inside `setState` and doesn't even schedule a render.
- **Late bail-out.** If React can't decide eagerly (other updates are queued on that fiber), it renders the component, sees the resulting state equals the old state, and **skips its children**. That's the "one extra render" you may notice in logs. It's harmless as long as render is pure.

### Case 2: different value, same output

```jsx
setFilter("ALL");   // was "all"; your render lowercases it → same JSX
```

State changed, so React renders the component and diffs its children (reconciliation), but the commit phase finds no DOM mutations. That costs CPU but no paint.

```text
setState(v)
  ├─ Object.is(v, current) && no queued work → stop (no render)
  ├─ Object.is equal after processing queue  → render once, skip children
  └─ different                               → render + reconcile → commit only diffs
```

## How to fix it

If you see wasted renders from "same" updates:

1. **Keep references stable.** Don't spread or clone objects when nothing changed; return `prev` from updaters.
2. **Guard updates** in subscription callbacks and effects.
3. **Normalize state** so equivalent values are actually identical.

```jsx
import { useEffect, useState } from "react";

function useWindowWidthBucket() {
  const [bucket, setBucket] = useState(() => toBucket(window.innerWidth));

  useEffect(() => {
    const onResize = () => setBucket(toBucket(window.innerWidth)); // string → bails out if same
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bucket;
}

const toBucket = (w) => (w < 768 ? "mobile" : w < 1200 ? "tablet" : "desktop");

// In a reducer or updater, return the same reference when nothing changed
setTodos((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, newTodo]));
```

> **💡 Interview tip:** Say "`Object.is`", not "`===`". They differ for `NaN` (equal in `Object.is`) and `+0`/`-0` (not equal).

## How to verify

- Log inside the component: a same-value update produces either no log or a single one, and children never log.
- The React DevTools Profiler shows no commit, or a commit where the children "did not render".
- Chrome DevTools Elements panel: no nodes flash, because there were no DOM mutations.

## Follow-up questions

- **Does `useReducer` bail out too?** Yes. If the reducer returns the same state reference, React bails out the same way.
- **Why does mutating and setting the same object not update the UI?** `Object.is(obj, obj)` is true, so React bails out. That's why you never mutate state.
- **Does `forceUpdate`-style `setTick(t => t + 1)` bail out?** No. The value changes each time, which is exactly why that trick works.

## Quick recap

- Same value by `Object.is` → bail-out; children don't render.
- React may call the component once more before bailing out; that's expected.
- New value, same output → render + reconcile, but zero DOM commits.
- Return the previous reference when nothing changed.
