---
title: "You need to render a large dataset without blocking the main thread — how do you approach it?"
tags: ["performance", "virtualization", "web-workers", "concurrent"]
difficulty: "hard"
---

## Short answer

I attack it from three sides: render less (virtualization and pagination), compute off the main thread (Web Workers for parsing, sorting and filtering), and keep the UI responsive while React works (`useTransition` / `useDeferredValue`). Ideally the server does the heavy filtering and only sends what the user can see.

## Why it happens

The browser has one main thread for JavaScript, layout, paint and input. Rendering 50,000 rows creates 50,000 sets of DOM nodes, and sorting or parsing a big JSON payload in a single synchronous call creates a long task. While that task runs, clicks and typing wait, so the page freezes and INP gets bad.

```text
Main thread:  [ parse 40MB JSON 900ms ][ render 50k rows 1200ms ][ input finally handled ]
User clicks here ^ ................................ waits 2s ......... ^
```

## How to fix it

### 1. Render only what is visible

```jsx
import { useVirtualizer } from "@tanstack/react-virtual";

function BigTable({ rows }) {
  const parentRef = useRef(null);
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });
  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((item) => (
          <div key={item.key}
               style={{ position: "absolute", top: 0, transform: `translateY(${item.start}px)`, height: item.size }}>
            {rows[item.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Move heavy computation to a Web Worker

```js
// sort.worker.js
self.onmessage = ({ data: { rows, key } }) => {
  const sorted = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : -1));
  self.postMessage(sorted);
};
```

```jsx
const worker = useMemo(() => new Worker(new URL("./sort.worker.js", import.meta.url), { type: "module" }), []);
useEffect(() => () => worker.terminate(), [worker]);

function sortBy(key) {
  worker.onmessage = (e) => setRows(e.data);
  worker.postMessage({ rows, key });
}
```

### 3. Mark updates as non-urgent

```jsx
const [isPending, startTransition] = useTransition();
const onFilter = (text) => {
  setInput(text);                              // urgent: input stays responsive
  startTransition(() => setFilter(text));      // interruptible re-render
};
```

### 4. Load in chunks

Paginate or use infinite scroll from the API, stream results, or process arrays in batches and yield with `scheduler.yield()` (where supported) or `setTimeout`.

> **💡 Interview tip:** Name the trade-off: virtualization breaks Ctrl+F and needs fixed or measured heights; workers add serialization cost for huge objects (use transferable `ArrayBuffer`s).

## How to verify

- Performance panel shows no long tasks over 50 ms during scroll and filter.
- DOM node count stays small (check with `document.querySelectorAll("*").length`).
- INP stays under 200 ms on a throttled mid-range phone.

## Follow-up questions

- **Can a Web Worker touch the DOM?** No; it only computes and posts messages back.
- **Does `useTransition` make work faster?** No; it makes rendering interruptible so urgent input wins.
- **When is pagination better than virtualization?** When users search or jump to records rather than scroll, and when the server can filter.

## Quick recap

- Render less: virtualize or paginate.
- Compute elsewhere: Web Workers or the server.
- Keep input urgent with `useTransition` / `useDeferredValue`.
- Measure long tasks and INP to confirm.
