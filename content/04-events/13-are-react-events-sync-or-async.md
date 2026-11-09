---
title: "Are React events synchronous or asynchronous?"
tags: ["events", "state", "batching", "scheduling"]
difficulty: "medium"
---

## Short answer

The **handlers run synchronously**: when the native event reaches the root, React calls your `onClick` immediately, top to bottom, on the same call stack. What looks "asynchronous" is the **state update**: `setState` only queues a change, and React renders after the handler finishes (batched). For discrete events like clicks and key presses, that render happens right away, before the browser handles the next event, so the UI feels instant.

## Explanation

Think of a cashier (the handler) who serves you on the spot, but the stock count on the shelf display (the UI) is updated in one go after the sale is rung up, not after every item is scanned.

```text
click
  -> React calls onClick synchronously
       setCount(1)     // queued, not applied
       console.log(count)  // old value
  -> handler returns
  -> React flushes queued updates (sync lane for discrete events)
  -> render -> commit -> paint -> useEffect
```

### What is synchronous

- Dispatching and running every handler in the propagation path.
- `e.preventDefault()` and `e.stopPropagation()` (they must be called synchronously to have any effect).
- Any plain code in the handler.

### What is deferred

- Applying the state update and re-rendering (batched until the handler ends).
- `useEffect` callbacks (after paint).
- Updates wrapped in `startTransition` (low priority, interruptible).

### Priority matters

| Event kind | Examples | When the render happens |
|---|---|---|
| Discrete | click, keydown, input, submit | Right after the handler, synchronously before the next event |
| Continuous | mousemove, scroll, wheel, pointermove | Soon, may be batched across frames |
| Transition | updates in `startTransition` | In the background, can be interrupted |

`flushSync` forces an immediate synchronous render when you truly need the DOM updated mid-handler.

## Example

```jsx
import { useState, startTransition } from "react";
import { flushSync } from "react-dom";

export default function Demo() {
  const [count, setCount] = useState(0);
  const [results, setResults] = useState([]);

  function handleClick(e) {
    e.preventDefault();           // sync: must happen now
    setCount((c) => c + 1);       // queued
    console.log("in handler", count); // still the old value

    setTimeout(() => {
      e.preventDefault();         // too late: default action already happened
    }, 0);
  }

  function handleSearch(e) {
    const q = e.target.value;
    startTransition(() => {
      setResults(expensiveFilter(q)); // low priority, keeps typing smooth
    });
  }

  function measure() {
    flushSync(() => setCount((c) => c + 1));
    console.log(document.getElementById("count").textContent); // updated
  }

  return (
    <>
      <a href="#" onClick={handleClick}>Increment</a>
      <input onChange={handleSearch} />
      <button onClick={measure}>Measure</button>
      <p id="count">{count}</p>
      <p>{results.length} results</p>
    </>
  );
}

const expensiveFilter = (q) => Array.from({ length: 5000 }, (_, i) => `${q}-${i}`);
```

## Common mistakes

- Saying "React events are asynchronous". The handler is synchronous; state application is deferred.
- Calling `preventDefault()` after an `await` or inside a timeout; the browser already performed the default action.
- Trying to `await setState(...)`; it does not return a promise.
- Wrapping everything in `flushSync` to "make state sync".

## Follow-up questions

- **Can a handler be `async`?** Yes, but only the code before the first `await` runs during the event; after that you are outside the event (React 18 still batches updates there).
- **Why do discrete events render synchronously?** Users expect a click or keystroke to be reflected before the next input, otherwise interactions could be processed against stale UI.

## Quick recap

- Handlers run synchronously on the event's call stack.
- State updates are queued and batched until the handler ends.
- Discrete events flush immediately after; transitions are deferred.
- `preventDefault` must be called synchronously.
