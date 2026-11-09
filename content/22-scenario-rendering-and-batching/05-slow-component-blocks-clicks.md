---
title: "A slow component blocks button clicks. How would you improve responsiveness?"
tags: ["scenario", "performance", "memo", "useTransition", "inp"]
difficulty: "medium"
---

## Short answer

First profile to find out why it is slow and why it re-renders. Then, in order: stop it re-rendering when it does not need to (move state down, pass children, `memo`), make its work cheaper (`useMemo`, virtualization, fewer DOM nodes), mark its updates as non-urgent with `startTransition` so clicks are never blocked, and move CPU-heavy logic to a Web Worker. The goal is no main-thread task longer than about 50 ms after a click.

## Why it happens

JavaScript is single-threaded. While React renders the slow component synchronously, the browser cannot run click handlers or paint feedback. Common root causes:

- State lives too high, so every click re-renders the slow sibling.
- Props change identity every render (inline objects/functions), defeating `memo`.
- Expensive calculations run on every render.
- Thousands of DOM nodes are rendered at once.
- The click handler itself does heavy synchronous work.

```text
 Click -> setOpen(true) in <Page>
            |
            v
 <Page> re-renders -> <SlowReport> re-renders (400 ms) even though its props did not change
            |
            v
 Button feedback paints 400 ms late  (poor INP)
```

## How to fix it

1. **Profile**: React DevTools Profiler ("why did this render?") plus Chrome Performance panel.
2. **Move state down** so the click only re-renders what it affects.
3. **Memoize** the slow component and stabilize its props (`useCallback`/`useMemo`, or let React Compiler do it).
4. **Cache expensive calculations** with `useMemo`; virtualize long lists.
5. **Use a transition** when the slow component must update in response to the click.
6. **Offload** heavy computation to a Web Worker; yield in long handlers.

```jsx
import { memo, useMemo, useState, useTransition } from "react";

// Before: open state in Page re-rendered SlowReport on every click.
export function Page({ data }) {
  const [filter, setFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <MenuToggle /> {/* state moved down: toggling no longer touches SlowReport */}
      <select
        value={filter}
        onChange={(e) => startTransition(() => setFilter(e.target.value))} // non-urgent
      >
        <option value="all">All</option>
        <option value="open">Open</option>
      </select>
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <SlowReport data={data} filter={filter} />
      </div>
    </>
  );
}

function MenuToggle() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen((o) => !o)}>Menu</button>
      {open && <nav>...</nav>}
    </>
  );
}

const SlowReport = memo(function SlowReport({ data, filter }) {
  const rows = useMemo(
    () => data.filter((d) => filter === "all" || d.status === filter),
    [data, filter]
  );
  return <ul>{rows.map((r) => <li key={r.id}>{r.title}</li>)}</ul>;
});
```

For heavy work inside a handler, give the browser a chance to paint first:

```js
async function onExport() {
  setExporting(true);                      // feedback paints first
  await new Promise((r) => setTimeout(r)); // or scheduler.yield() where supported
  const csv = buildCsv(rows);              // or post to a Web Worker
  download(csv);
  setExporting(false);
}
```

> **⚠️ Gotcha:** `memo` does nothing if a parent passes a new object, array or function each render. Check prop identity in the Profiler before adding more memoization.

## How to verify

- Profiler: clicking the menu no longer shows `SlowReport` in the commit.
- Performance panel: no long task (red corner) between pointer down and next paint.
- INP under 200 ms in the Web Vitals extension or field data.
- Repeat on a throttled CPU to catch issues hidden on a fast laptop.

## Follow-up questions

- **What is INP?** Interaction to Next Paint: the delay from a user interaction to the next frame; a Core Web Vital that directly captures this problem.
- **Does React Compiler help?** It auto-memoizes components and values, removing many unnecessary re-renders, but it cannot make a single heavy calculation cheaper.
- **When is `memo` not worth it?** When the component is cheap or its props change on almost every render anyway.

## Quick recap

- Profile first: find what renders and why.
- Move state down, `memo` with stable props, `useMemo` heavy calculations.
- Use `startTransition` for non-urgent updates.
- Virtualize big lists; offload heavy CPU work to a worker.
- Verify with Profiler, Performance panel and INP.
