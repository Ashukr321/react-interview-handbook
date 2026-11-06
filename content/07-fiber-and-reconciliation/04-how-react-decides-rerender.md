---
title: "How does React decide which components need to re-render?"
tags: ["re-render", "bailout", "lanes", "internals"]
difficulty: "hard"
---

## Short answer

A component re-renders when it has a pending update of its own (state or a consumed context changed), or when its parent re-renders and React cannot bail out. Internally, every fiber tracks `lanes` (its own pending work) and `childLanes` (pending work somewhere below it). During the render phase React skips fibers whose props, context and lanes are unchanged, and skips whole subtrees whose `childLanes` are empty.

## Explanation

### What marks a fiber as dirty

- `setState` / `dispatch` on that component adds an update to its hook queue and marks the fiber's `lanes`. React then walks up via `return` pointers adding the lane to every ancestor's `childLanes`.
- A context provider value change (compared with `Object.is`) marks every consumer fiber below it.
- Its parent re-rendered and created a new props object.

### The bailout check (in `beginWork`)

React can skip rendering a fiber when **all** of these hold:

| Condition | Why it matters |
|---|---|
| `oldProps === newProps` (reference equality) | JSX creates a new props object each render, so this fails whenever the parent renders |
| No legacy context change | Old context API forced re-render |
| Fiber has no update in the current render lanes | Nothing scheduled on it |

If the fiber bails out and `childLanes` doesn't include the render lanes, the entire subtree is skipped. Otherwise React clones the children and keeps descending to find the dirty ones.

### Ways you widen the bailout

- `React.memo(Component)` replaces reference equality with a shallow props comparison.
- Passing children as props (`<Layout>{children}</Layout>`): the `children` elements were created by the grandparent, so they keep the same reference when only `Layout` state changes.
- Moving state down so fewer components sit under the state owner.
- React Compiler (React 19 era) auto-memoizes JSX and values so bailouts happen without manual `memo`.

### State-setter shortcut

If you call `setCount(5)` while `count` is already `5`, React compares with `Object.is` and may skip the render entirely ("eager state"), or render that one component and then bail out on its children.

## Example

```jsx
import { useState, memo } from "react";

const Child = memo(function Child({ label }) {
  console.log("Child render");
  return <p>{label}</p>;
});

export default function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      {/* Parent re-renders; Child's props are shallow-equal -> bail out */}
      <Child label="static" />
    </>
  );
}
```

Without `memo`, `Child` would re-render on every click because its props object is new.

## Common mistakes

- Believing React re-renders only components whose props changed. By default, **all descendants** of a re-rendering component render again.
- Passing inline objects/functions to a memoized child, which defeats the shallow comparison.
- Mutating state (`arr.push`) then calling `setArr(arr)`: same reference, so React bails out and nothing updates.

> **⚠️ Gotcha:** Re-rendering does not mean DOM updates. A component can render and produce identical output, resulting in zero DOM writes.

## Follow-up questions

- **Does context bypass `memo`?** Yes. A consumer re-renders when the context value changes even if it is memoized.
- **How can I see why something rendered?** React DevTools Profiler, "Record why each component rendered".
- **Does a re-render of a child re-render its parent?** No. Updates flow down; the parent only has its `childLanes` set.

## Quick recap

- Triggers: own state, consumed context, or a parent re-render.
- Fibers carry `lanes` and `childLanes` to locate pending work.
- Bailout needs identical props reference and no pending update.
- `memo`, children-as-props, state colocation and React Compiler extend bailouts.
