---
title: "A timer keeps using an old state value. Why?"
tags: ["scenario", "stale-closure", "setInterval", "useEffect"]
difficulty: "medium"
---

## Short answer

The timer callback is a closure created during one render, and it captured that render's state value. If the interval is set up once in an effect with `[]`, it keeps calling the first render's callback forever, so it always sees the initial value. Fix it with a functional updater (`setCount(c => c + 1)`), by reading the latest value from a ref, or by including the value in the dependencies so the interval is recreated.

## Why it happens

Each render is a snapshot: `count` is a constant inside that render's functions. A closure remembers the variables from the render that created it, like a photo that never updates.

```text
 Render 1 (count = 0) -> effect creates interval callback  () => setCount(0 + 1)
 Render 2 (count = 1) -> effect does NOT re-run ([] deps)
 Every tick           -> same old callback -> setCount(0 + 1) -> stuck at 1
```

```jsx
function BuggyCounter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // count is always 0 here
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{count}</p>; // shows 1 forever
}
```

## How to fix it

**Option 1: functional updater** (best when you only need to compute the next state)

```jsx
import { useEffect, useRef, useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{count}</p>;
}
```

**Option 2: ref for the latest value** (when the callback must read state for something else, like logging or sending)

```jsx
export function AutoSave({ draft }) {
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft; // always holds the latest value
  }, [draft]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/drafts", { method: "PUT", body: JSON.stringify(draftRef.current) });
    }, 5000);
    return () => clearInterval(id);
  }, []);
  return null;
}
```

**Option 3: depend on the value**. Correct, but the interval is cleared and recreated on every change, which resets its timing:

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]);
```

**React 19.2+**: `useEffectEvent` gives the callback the latest props and state without adding them to the dependencies:

```jsx
import { useEffect, useEffectEvent } from "react";

function AutoSaveWithEvent({ draft }) {
  const save = useEffectEvent(() => {
    fetch("/api/drafts", { method: "PUT", body: JSON.stringify(draft) });
  });
  useEffect(() => {
    const id = setInterval(() => save(), 5000);
    return () => clearInterval(id);
  }, []);
  return null;
}
```

## How to verify

- The counter increases every second; log inside the callback shows the current value.
- `react-hooks/exhaustive-deps` warns about `count` missing in the buggy version; listen to it.
- Unmount the component and confirm no more ticks (cleanup works).

## Follow-up questions

- **Why does `setCount(c => c + 1)` work?** React passes the latest queued state to the updater at processing time, so the closure does not need to know `count`.
- **Is this unique to timers?** No: event listeners, subscriptions, promises and `setTimeout` callbacks created in an effect all capture a render's snapshot.
- **What is the `useInterval` custom hook?** A popular pattern that stores the callback in a ref and keeps one interval running, giving the timer the latest callback.

## Quick recap

- Closures capture state from the render that created them.
- An interval set up once keeps the first render's values.
- Use a functional updater, a ref, or proper dependencies.
- `useEffectEvent` (React 19.2+) reads latest values without re-subscribing.
