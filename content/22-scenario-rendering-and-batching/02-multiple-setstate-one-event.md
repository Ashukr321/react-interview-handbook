---
title: "Multiple setState calls happen in one event. How many renders occur?"
tags: ["scenario", "batching", "setState", "rendering"]
difficulty: "easy"
---

## Short answer

One. Since React 18 (with `createRoot`), all state updates in the same event, timeout, promise or native handler are automatically batched: React queues them and performs a single render and a single commit at the end. In React 17 and earlier, only updates inside React event handlers were batched; updates in `setTimeout` or after `await` caused one render each.

## Why it happens

React does not render synchronously on `setState`. Each call adds an update to a queue on the component's fiber and schedules work. When the current task finishes, React processes all queued updates together, in order, then renders once. Like a waiter collecting a whole table's order before going to the kitchen.

```text
 onClick:
   setCount(c => c + 1)   -> queue
   setFlag(true)          -> queue
   setName("Ana")         -> queue
 handler ends
   -> React processes queue -> 1 render -> 1 commit -> effects
```

A classic trap is the stale value:

```jsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1); // all read the same "count" -> +1, not +3
```

## How to fix it

There is usually nothing to fix; batching is a feature. The real issues are correctness and the rare need to opt out.

1. Use updater functions when the next state depends on the previous one.
2. Group related values in one state object or `useReducer` if they always change together.
3. Only if you need the DOM updated mid-handler, use `flushSync` to force an immediate render.

```jsx
import { useState } from "react";
import { flushSync } from "react-dom";

export function Counter() {
  const [count, setCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  console.log("render", { count, clicks });

  async function handleClick() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setClicks((n) => n + 1);       // still 1 render for these three

    await new Promise((r) => setTimeout(r, 500));
    setCount((c) => c + 1);
    setClicks((n) => n + 1);       // batched too (React 18+): 1 more render

    flushSync(() => setCount((c) => c + 1)); // forced: renders immediately
  }

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

> **💡 Interview tip:** Answer "one render per batch", then show you know the React 17 difference and the updater-function trap.

## How to verify

- Put a `console.log` in the component body and count logs per click (in Strict Mode dev, each render is invoked twice, but there is still one commit).
- React DevTools Profiler: one commit per batch.
- Check you use `createRoot`; legacy `ReactDOM.render` keeps React 17 batching behavior (and is removed in React 19).

## Follow-up questions

- **Are updates in different events batched together?** No; each user event is its own batch, so two clicks give two renders.
- **What if the state does not change?** If the new value is `Object.is` equal to the current one, React can bail out and skip re-rendering children.
- **How do class components behave?** `this.setState` calls are batched the same way; read the result in the `setState` callback or `componentDidUpdate`.

## Quick recap

- React 18+: one render per batch, everywhere (automatic batching).
- React 17: batched only inside React event handlers.
- Use updater functions to avoid stale values.
- `flushSync` is the explicit opt-out.
