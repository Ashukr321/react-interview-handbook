---
title: "What happens when state updates inside an event handler?"
tags: ["events", "state", "batching", "rendering"]
difficulty: "medium"
---

## Short answer

Calling `setState` inside a handler does **not** change the variable immediately. React queues the update on the component's fiber with a priority (lane) based on the event, keeps running the rest of the handler, and **batches** all queued updates. After the handler finishes, React re-renders the affected components once with the new state, commits the DOM changes, then runs effects. Inside the handler, `state` still holds the value from the current render.

## Explanation

State is like a restaurant order ticket. Writing a new order (`setCount`) does not instantly change what is on your plate; the kitchen processes all tickets from your table together and then serves one updated plate (the next render).

```text
onClick fires
  setCount(count + 1)   -> update queued (lane: SyncLane for click)
  setName("Ada")        -> update queued
  console.log(count)    -> still the OLD value (snapshot)
handler returns
  -> React processes the queue: ONE render with both updates
  -> commit DOM, useLayoutEffect, paint, useEffect
```

### Key behaviours

- **Snapshot**: each render has its own `count`; handlers close over that render's values.
- **Batching**: all updates in one event produce one render (React 18+ also batches in timeouts, promises and native listeners).
- **Functional updates**: `setCount(c => c + 1)` reads the latest queued value, so calling it three times adds 3. `setCount(count + 1)` three times adds 1.
- **Bail-out**: if the new value is `Object.is` equal to the current one, React can skip re-rendering that component.
- **Priority**: a click is a discrete event, so its update is rendered synchronously before the next event. Wrap non-urgent updates in `startTransition` to make them interruptible.
- **Need the DOM updated now?** `flushSync(() => setX(...))` forces a synchronous render (use rarely, e.g. before scrolling to a new item).

## Example

```jsx
import { useState } from "react";
import { flushSync } from "react-dom";

export default function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    console.log(count); // 0: snapshot, not updated yet
    // After render: count === 1, not 2
  }

  function handleClickCorrect() {
    setCount((c) => c + 1);
    setCount((c) => c + 1); // count === 2 after one render
  }

  function addAndScroll() {
    flushSync(() => setCount((c) => c + 1)); // DOM updated before next line
    document.getElementById("end").scrollIntoView();
  }

  console.log("render", count);
  return (
    <>
      <p>{count}</p>
      <button onClick={handleClick}>+1 (stale)</button>
      <button onClick={handleClickCorrect}>+2</button>
      <button onClick={addAndScroll}>+1 and scroll</button>
      <div id="end" />
    </>
  );
}
```

## Common mistakes

- Reading state right after setting it and expecting the new value.
- Using `setX(x + 1)` multiple times instead of the updater form.
- Mutating state (`arr.push`) then calling `setArr(arr)`; same reference means React bails out.
- Using `flushSync` everywhere "to make it synchronous", which hurts performance.

## Follow-up questions

- **How do you act on the new value?** Compute it into a variable first (`const next = count + 1; setCount(next); send(next);`), or react in an effect if it is a side effect of the state change.
- **Is `setState` asynchronous?** The update is deferred and batched, not a promise; you cannot `await` it.
- **Do class components behave the same?** Yes, `this.setState` is batched too, and `this.state` updates after the render; use the callback form or `componentDidUpdate` to act after.

## Quick recap

- `setState` queues an update; the current variable is a snapshot.
- All updates in one event are batched into one render.
- Use updater functions for sequential updates.
- Event priority decides how urgently the render happens; `flushSync` forces it.
