---
title: "How was batching different before React 18?"
tags: ["batching", "react-17", "legacy"]
difficulty: "medium"
---

## Short answer

Before React 18, React only batched updates that happened synchronously inside its own event handlers and lifecycle methods. Updates inside `setTimeout`, promises, `async` functions after an `await`, or native DOM event listeners were not batched: each `setState` triggered its own synchronous render and commit. Developers had to wrap such code in `ReactDOM.unstable_batchedUpdates` to batch it.

## Explanation

### Why the old behavior existed

The legacy reconciler batched using an execution-context flag. When React dispatched a synthetic event, it set the flag, ran your handler, and flushed all updates once the handler returned. Anything that ran later on the event loop executed outside that context, so React treated each update as "flush now".

```text
React 17 click handler:
  [batch flag ON]  setA(); setB();  [flag OFF] -> 1 render

React 17 inside setTimeout / promise:
  setA() -> render + commit
  setB() -> render + commit       (2 renders, intermediate UI possible)
```

### Side-by-side

| Where the update happens | React 17 (legacy root) | React 18+ (`createRoot`) |
|---|---|---|
| React `onClick` handler | Batched | Batched |
| `componentDidMount` / `useEffect` | Batched | Batched |
| `setTimeout` / `setInterval` | Not batched | Batched |
| Promise `.then` / after `await` | Not batched | Batched |
| `addEventListener` handler | Not batched | Batched |
| Inside `unstable_batchedUpdates` | Batched | Batched (wrapper unnecessary) |

### Visible side effects of the old model

- Extra renders in async code (common in data fetching).
- Intermediate states rendered, e.g. `data` set but `loading` still `true`.
- In class components, `this.state` was updated synchronously after `setState` in a timeout, so code sometimes depended on it.

Analogy: an elevator that waits for everyone in the lobby only when the doorman is present (React events). Without the doorman (timeouts, promises), it leaves with each person individually.

## Example

```jsx
import { useState } from "react";
import { unstable_batchedUpdates } from "react-dom";

export default function Legacy() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => {
        // React 17: without this wrapper, two separate renders.
        // React 18 with createRoot: batched automatically; the wrapper is unnecessary.
        unstable_batchedUpdates(() => {
          setItems(data);
          setLoading(false);
        });
      });
  };

  return (
    <>
      <button onClick={load}>Load</button>
      {loading ? <p>Loading…</p> : <ul>{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>}
    </>
  );
}
```

## Common mistakes

- Saying React 17 never batched. It did, inside React-managed events.
- Assuming upgrading to React 18 alone changes behavior. Only `createRoot` enables it; `ReactDOM.render` (removed in React 19) kept legacy semantics.
- Migrating code that read `this.state` right after `setState` in a timeout; it breaks under automatic batching.

## Follow-up questions

- **How do you migrate code that needed synchronous updates?** Wrap that specific update in `flushSync`.
- **Did React 17 batch updates across multiple components in one event?** Yes, all updates in a single React event were batched.
- **Why didn't React batch everything earlier?** Without Fiber's lane-based scheduling and the new root API, changing it would have broken existing apps relying on synchronous updates.

## Quick recap

- Pre-18: batching only inside React event handlers and lifecycles.
- Timeouts, promises and native listeners caused one render per update.
- `unstable_batchedUpdates` was the workaround.
- React 18 `createRoot` made batching automatic everywhere.
