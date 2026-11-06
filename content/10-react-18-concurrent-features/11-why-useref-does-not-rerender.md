---
title: "Why doesn't useRef cause a re-render?"
tags: ["hooks", "useref", "re-render", "internals"]
difficulty: "easy"
---

## Short answer

`useRef` returns the same plain object `{ current }` on every render, stored on the component's fiber. Changing `ref.current` is just a JavaScript property assignment; it does not call React's dispatcher or enqueue an update, so React has no idea anything changed and schedules no render. Only `setState`, `useReducer` dispatch, or an external store notification schedule renders.

## Explanation

Internally, hooks are a linked list on the fiber (`fiber.memoizedState`). For `useRef`:

```text
mount:  hook.memoizedState = { current: initialValue }   // created once
update: return hook.memoizedState                         // same object returned
```

Compare with `useState`:

```text
setState(x) -> create update -> add to hook queue -> scheduleUpdateOnFiber -> render
ref.current = x -> plain mutation -> nothing scheduled
```

Analogy: state is a notice board in the office lobby; changing it alerts everyone. A ref is a sticky note in your drawer; you can rewrite it whenever you want and no one is told.

### Good uses for refs

| Use | Why a ref |
|---|---|
| DOM nodes (`ref={inputRef}`) | Imperative focus, measure, scroll |
| Timer and interval IDs | Needed for cleanup, never displayed |
| Previous value / latest callback | Read in effects without re-subscribing |
| AbortController for in-flight requests | Survives renders, no UI impact |
| Mutable counters for analytics | Changing them shouldn't re-render |

### Rules

- Don't read or write `ref.current` **during rendering** (except lazy init). It makes the output depend on something React doesn't track and breaks with concurrent rendering and StrictMode.
- Read and write refs in event handlers and effects.
- In React 19, `ref` is a regular prop for function components, so `forwardRef` is no longer needed, and ref callbacks can return a cleanup function.

## Example

```jsx
import { useRef, useState } from "react";

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0); // shown on screen -> state
  const intervalRef = useRef(null); // not shown -> ref
  const clicksRef = useRef(0); // not shown -> ref

  function start() {
    clicksRef.current += 1; // no re-render
    if (intervalRef.current) return;
    const startedAt = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAt); // re-render each tick
    }, 100);
  }

  function stop() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  return (
    <>
      <p>{(elapsed / 1000).toFixed(1)}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}
```

## Common mistakes

- Displaying `ref.current` in JSX and expecting the UI to update when it changes.
- Putting `ref.current` in a dependency array. Effects won't re-run on mutation since nothing re-renders.
- Using a ref to "avoid re-renders" for data the UI actually depends on, leading to stale screens.
- Mutating refs during render, which causes inconsistent output under StrictMode double rendering.

## Follow-up questions

- **How do you force a re-render after changing a ref?** Pair it with state, or better, use state if the UI depends on it.
- **How is `useRef` different from a module-level variable?** A ref is per component instance and is cleaned up with it; a module variable is shared across all instances.
- **Why not `useState` with a mutable object?** You could, but `useRef` states the intent and avoids the unused setter.

## Quick recap

- `useRef` returns the same object every render.
- Mutating `.current` schedules nothing.
- Use refs for values not shown in the UI.
- Don't read or write refs during render.
- React 19: `ref` is a normal prop.
