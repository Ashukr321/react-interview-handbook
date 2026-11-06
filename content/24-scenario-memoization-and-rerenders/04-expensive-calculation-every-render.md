---
title: "Expensive calculations execute on every render. How would you optimize them?"
tags: ["usememo", "performance", "derived-state", "web-workers"]
difficulty: "medium"
---

## Short answer

First confirm it's actually expensive (`console.time`, Profiler). Then cache it with `useMemo` keyed on the inputs it really depends on, so it only reruns when those inputs change. If it's still slow when the inputs *do* change, reduce the work (precompute, index, paginate), move it off the main thread with a Web Worker, or mark the update non-urgent with `useDeferredValue` / `startTransition`.

## Why it happens

The component body is a plain function, so React runs every line of it on every render, including renders caused by unrelated state such as a modal toggle or a hover. A 50 ms sort that runs on every keystroke makes typing feel broken.

Typical culprits:

- Sorting or filtering large arrays inline.
- Building lookup maps (`items.reduce(...)`) in render.
- Parsing or formatting large data (dates, markdown, CSV).
- Storing derived data in state and syncing it with `useEffect`, which adds an extra render on top of the computation.

## How to fix it

### 1. Cache with `useMemo`

```jsx
import { useMemo, useState } from "react";

export default function ProductTable({ products }) {
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const visible = useMemo(() => {
    console.time("filter+sort");
    const q = query.toLowerCase();
    const result = products
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => a.price - b.price);
    console.timeEnd("filter+sort");
    return result;
  }, [products, query]); // toggling the modal no longer recomputes

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => setShowModal((s) => !s)}>Info</button>
      <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  );
}
```

### 2. Lazy initial state for one-time work

```jsx
const [index] = useState(() => buildSearchIndex(products)); // runs once, not every render
```

### 3. Reduce or relocate the work

- Precompute on the server, or once when data arrives (in the fetch or select layer, e.g. TanStack Query's `select`).
- Paginate or virtualize so you only process what's visible.
- Move CPU-heavy work (more than ~100 ms) into a **Web Worker**.

### 4. Keep the UI responsive while inputs change

Wrap the heavy consumer with `useDeferredValue(query)` so typing stays instant while the list catches up.

> **⚠️ Gotcha:** Don't "optimize" by copying derived data into state with `useEffect`. Compute it during render, and memoize it if needed.

> **💡 Interview tip:** The **React Compiler** auto-memoizes derived values like `visible`, but it can't make one big synchronous computation faster. Algorithms, workers and virtualization still matter.

## How to verify

- `console.time` logs should appear only when `products` or `query` change, not when the modal toggles.
- The Chrome Performance panel should no longer show long tasks (over 50 ms) on unrelated interactions.
- Test with CPU throttling (4x/6x) to simulate low-end devices.

## Follow-up questions

- **How expensive is "expensive"?** React's docs suggest roughly 1 ms or more, measured in a production build.
- **Does `useMemo` help on the first render?** No. It only skips work on later renders with unchanged deps.
- **What if deps change on every keystroke anyway?** Then memoization can't help. Defer the update, debounce, or use a worker.

## Quick recap

- Measure before optimizing.
- `useMemo` caches across unrelated renders.
- Lazy `useState` initializers handle one-time work.
- Heavy work goes to the server, a worker, or a virtualized subset.
- Derive during render; don't sync derived state with effects.
