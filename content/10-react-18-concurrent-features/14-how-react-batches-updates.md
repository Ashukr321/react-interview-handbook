---
title: "How does React batch updates?"
tags: ["batching", "react-18", "state", "performance"]
difficulty: "medium"
---

## Short answer

Batching means React groups multiple state updates made in the same tick into a single re-render. Since React 18 with `createRoot`, this is **automatic everywhere**: event handlers, promises, `setTimeout`, native event listeners. Updates are queued, and React renders once when the current task finishes. You can opt out for a specific update with `flushSync`.

## Explanation

Analogy: a waiter collecting orders from the whole table before going to the kitchen, instead of running back after each person speaks.

### Before vs after React 18

| Where updates happen | React 17 (`ReactDOM.render`) | React 18+ (`createRoot`) |
|---|---|---|
| React event handlers | Batched | Batched |
| `setTimeout` / promises / `fetch().then` | Not batched (render per `setState`) | Batched |
| Native `addEventListener` callbacks | Not batched | Batched |

### How it works internally

```text
setA(1)  -> update added to hook queue, lane marked on root
setB(2)  -> update added to hook queue, same lane
setC(3)  -> ...
            ensureRootIsScheduled: a task is already scheduled -> reuse it
end of current task / microtask
            -> one render processes all queued updates
            -> one commit
```

- Each `setState` enqueues an update object and marks a lane on the root; it does not render.
- `ensureRootIsScheduled` schedules **one** callback per priority. Sync-lane updates are flushed in a microtask; others go through the Scheduler.
- Because state is read at render time, the component sees the final values of all queued updates.

### Consequences

- Reading state right after `setState` gives the old value (it's a snapshot of the current render).
- Use updater functions (`setCount(c => c + 1)`) when the next value depends on the previous one within a batch.
- Use `flushSync` when you must read the updated DOM immediately (e.g. scroll to a newly added item).

## Example

```jsx
import { useState } from "react";
import { flushSync } from "react-dom";

function Checkout() {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  async function placeOrder() {
    setLoading(true);
    setError(null); // batched with setLoading -> 1 render
    try {
      const res = await fetch("/api/order", { method: "POST" });
      const data = await res.json();
      setOrder(data);
      setLoading(false); // batched -> 1 render (not batched in React 17)
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  return <button onClick={placeOrder}>{loading ? "Placing..." : "Order"}</button>;
}

function ChatList({ listRef }) {
  const [msgs, setMsgs] = useState([]);
  function add(msg) {
    flushSync(() => setMsgs((m) => [...m, msg])); // commit now
    listRef.current.lastElementChild.scrollIntoView(); // DOM is updated
  }
  // ...
}
```

## Common mistakes

- `setCount(count + 1)` three times expecting +3. All three read the same snapshot; use the updater form.
- Logging state right after setting it and concluding "setState is broken".
- Overusing `flushSync`, which disables batching and hurts performance.
- Assuming batching applies across separate user events. Two separate clicks are two separate batches.

## Follow-up questions

- **Is `setState` asynchronous?** It is better described as deferred: it schedules a render instead of performing one immediately.
- **Do batched updates of different priority render together?** No. Updates are batched per lane; a transition and an urgent update in the same handler render in separate passes.
- **Does batching apply to the legacy root in React 18?** No, `ReactDOM.render` keeps React 17 behavior (and was removed in React 19).

## Quick recap

- Multiple updates in one tick = one render.
- Automatic everywhere with `createRoot` (React 18+).
- Updater functions for dependent updates.
- `flushSync` to opt out when you need the DOM immediately.
- State is a snapshot per render.
