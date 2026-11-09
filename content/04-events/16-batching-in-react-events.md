---
title: "How does batching work in React events?"
tags: ["batching", "state", "react-18", "performance"]
difficulty: "medium"
---

## Short answer

Batching means React groups multiple state updates into **one re-render**. Updates are queued as they are called, and React processes the whole queue once the current task finishes. Before React 18, batching happened only inside React event handlers. With `createRoot` in React 18+, **automatic batching** applies everywhere: event handlers, `setTimeout`, promises, `fetch` callbacks and native listeners. Use `flushSync` to opt out for a specific update.

## Explanation

A waiter does not run to the kitchen after each dish you order; he writes down the whole order and goes once. That is batching. Without it, three `setState` calls could mean three renders and possibly a flash of inconsistent UI.

```text
handler starts
  setA(1)  -> queue [A]
  setB(2)  -> queue [A, B]
  setC(3)  -> queue [A, B, C]
handler ends
  -> one render with A, B, C applied
  -> one commit
```

### React 17 vs React 18+

| Where updates happen | React 17 (`ReactDOM.render`) | React 18+ (`createRoot`) |
|---|---|---|
| React event handler | Batched | Batched |
| `setTimeout` / `setInterval` | Not batched (render per update) | Batched |
| Promise `.then` / after `await` | Not batched | Batched |
| Native `addEventListener` | Not batched | Batched |

### How it works internally (simplified)

Each `setState` creates an update object, attaches it to the fiber's queue and marks a **lane** (priority). React then schedules one render for the root. Updates with the same lane in the same tick get processed together. Discrete events (click) use the sync lane and flush in a microtask right after the handler; other updates flush in a scheduled task.

### Opting out

`flushSync(() => setX(v))` renders immediately and synchronously. Use it when you need the DOM updated before the next line, such as scrolling to a newly added item or integrating with a non-React library.

## Example

```jsx
import { useState } from "react";
import { flushSync } from "react-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log("render"); // logs once per batch

  async function load() {
    setLoading(true);
    setError(null); // batched with setLoading -> one render

    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      // After await: React 18+ still batches these two
      setUser(data);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  function addItemAndScroll() {
    flushSync(() => setUser((u) => ({ ...u, items: [...(u?.items ?? []), "new"] })));
    document.querySelector("li:last-child")?.scrollIntoView(); // DOM already updated
  }

  return (
    <div>
      <button onClick={load}>Load</button>
      <button onClick={addItemAndScroll}>Add item</button>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      <ul>{user?.items?.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
    </div>
  );
}
```

## Common mistakes

- Thinking batching merges `setCount(count + 1)` twice into +2. Both read the same snapshot; use `setCount(c => c + 1)`.
- Expecting state to be readable right after setting it inside the handler.
- Using legacy `ReactDOM.render` and wondering why timeouts are not batched (removed in React 19 anyway).
- Overusing `flushSync`, which disables the benefit and can hurt performance.

## Follow-up questions

- **Does batching span two separate clicks?** No. Each discrete event is processed separately so user intent stays clear.
- **What was `unstable_batchedUpdates`?** The React 17 API to batch outside handlers; unnecessary in React 18+.
- **Does batching affect class components?** Yes, `this.setState` calls are batched the same way.

## Quick recap

- Batching = many updates, one render.
- React 18+ batches automatically everywhere with `createRoot`.
- Updates are queued per fiber and processed by lane.
- `flushSync` opts out when the DOM must update immediately.
