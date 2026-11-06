---
title: "A list of 5,000 items updates every second. How does React efficiently update the UI?"
tags: ["lists", "keys", "reconciliation", "virtualization", "performance"]
difficulty: "hard"
---

## Short answer

React matches old and new list items by **key**, reuses the existing DOM nodes, and commits only the attributes and text that actually changed, so ten changed prices mean roughly ten DOM writes, not 5,000. Updates within the tick are **batched** into one render and one commit. The remaining cost is the *render* work of calling 5,000 components each second, so you add `memo` rows with stable props, keep row data immutable, and **virtualize** to render only the ~30 visible rows.

## Why it happens

```text
tick ─► setRows(next)  (batched into one render)
        └─ <List> renders
             ├─ diff children by key: "a1" ↔ "a1", "a2" ↔ "a2" ...
             ├─ same key + same type → reuse Fiber + DOM node, compare props
             └─ commit: patch only changed text/attributes
```

What React does well:

- **Keyed reconciliation**: finding matches is O(n), with no costly tree-diff algorithm.
- **Minimal commits**: unchanged props mean no DOM writes.
- **Automatic batching** (React 18+): several `setState` calls in a timer or socket handler produce one render.

What still costs time without help:

- Calling 5,000 row components and creating 5,000 element objects every second.
- With 5,000 real DOM nodes, initial layout, memory and scroll performance are all heavy.

## How to fix it

1. **Stable keys** from data ids (never index, if rows can reorder or be inserted).
2. **Immutable updates** that keep references for unchanged rows.
3. **`memo` rows** (or the React Compiler) so unchanged rows skip rendering.
4. **Virtualize** with `react-window` or TanStack Virtual.
5. **Throttle** high-frequency feeds and consider `startTransition` for non-urgent refreshes.

```jsx
import { memo, useEffect, useState } from "react";

const Row = memo(function Row({ item }) {
  return (
    <li>
      {item.symbol}: {item.price.toFixed(2)}
    </li>
  );
});

export default function Ticker({ socket, initial }) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    return socket.onBatch((changes) => {
      // changes: Map<id, price>. Only changed rows get new objects
      setRows((prev) =>
        prev.map((r) => (changes.has(r.id) ? { ...r, price: changes.get(r.id) } : r))
      );
    });
  }, [socket]);

  return (
    <ul>
      {rows.map((r) => (
        <Row key={r.id} item={r} />
      ))}
    </ul>
  );
}
```

Now each tick, unchanged rows keep the same `item` reference, so `memo` skips them and only the changed rows render and commit. Add virtualization and it's ~30 components per tick instead of 5,000.

> **💡 Interview tip:** Separate the two costs out loud: "React's reconciliation keeps **DOM work** minimal; memoization and virtualization keep **render work** minimal."

## How to verify

- Profiler: per tick, only the changed rows should show as rendered.
- Paint flashing: only the changed cells flash.
- Performance panel: each tick's task should stay well under 50 ms with CPU throttling.
- Count DOM nodes before and after virtualization.

## Follow-up questions

- **Why are index keys bad here?** If rows are inserted or sorted, indexes shift, so React patches the wrong nodes and preserves the wrong state.
- **Why not just `useMemo` the list?** The data changes every tick; memoizing rows individually is what helps.
- **Would `useDeferredValue` help?** It keeps other interactions responsive while the big list updates, but doesn't reduce the work.

## Quick recap

- Keys let React reuse nodes and patch only diffs.
- Batching gives one render and one commit per tick.
- Immutable updates + `memo` rows skip unchanged rows.
- Virtualization cuts both render and DOM cost.
