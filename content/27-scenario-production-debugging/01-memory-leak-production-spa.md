---
title: "You notice a memory leak in a production SPA — how do you identify and fix it?"
tags: ["memory-leak", "debugging", "devtools", "useEffect"]
difficulty: "hard"
---

## Short answer

I first confirm the leak by watching heap size grow in Chrome DevTools (Performance monitor or Memory panel) while repeating a user flow. Then I take heap snapshots before and after, compare them, and look for detached DOM nodes or objects that keep growing. In React apps the cause is almost always a missing cleanup in `useEffect`: timers, event listeners, subscriptions, sockets or unbounded caches.

## Why it happens

An SPA never reloads the page, so anything that is still referenced is never garbage-collected. Common culprits:

- `setInterval` / `setTimeout` not cleared on unmount
- `window` / `document` listeners added but never removed
- WebSocket, `EventSource` or store subscriptions left open
- Module-level caches or arrays that only ever grow
- Closures holding big objects (old props, large responses)
- Third-party widgets (maps, charts) not destroyed on unmount

## How to fix it

### 1. Reproduce and measure

```text
Open DevTools -> Memory
  1. Take heap snapshot (baseline)
  2. Navigate to page X and back 10 times
  3. Click "collect garbage" (trash icon)
  4. Take snapshot 2 -> view "Comparison"
  5. Sort by "# Delta" / search "Detached"
```

Objects whose count keeps rising by roughly 10 are your leak. The "Retainers" pane shows who is holding them.

### 2. Add cleanup to every effect that subscribes

```jsx
useEffect(() => {
  const controller = new AbortController();
  const id = setInterval(refresh, 5000);
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", onResize);

  fetch("/api/data", { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => { if (e.name !== "AbortError") throw e; });

  return () => {
    clearInterval(id);
    window.removeEventListener("resize", onResize);
    controller.abort();
  };
}, []);
```

### 3. Destroy third-party instances

```jsx
useEffect(() => {
  const chart = new Chart(canvasRef.current, config);
  return () => chart.destroy();
}, [config]);
```

### 4. Bound your caches

Replace ever-growing `Map`s with an LRU, use `WeakMap` when keys are objects, and give React Query / SWR a sensible `gcTime`.

> **💡 Interview tip:** Mention that React 18+ StrictMode mounts, unmounts and remounts effects in development precisely to expose missing cleanups.

## How to verify

- Repeat the same flow 10-20 times; the heap should return to a flat sawtooth after GC.
- "Detached" search in the snapshot should show no growing DOM trees.
- In production, track `performance.memory` (Chromium only) or long-session crash rates in your RUM tool.

## Follow-up questions

- **What is a detached DOM node?** A node removed from the document but still referenced from JavaScript, so it cannot be collected.
- **Did React 18 remove the "setState on unmounted component" warning?** Yes; it was mostly a false positive. Real leaks come from subscriptions, not that setState.
- **When would you use `WeakRef` or `WeakMap`?** For caches keyed by objects, so entries disappear when the key is no longer used elsewhere.

## Quick recap

- Confirm with the Performance monitor, locate with heap snapshot comparison.
- Look for detached nodes and growing object counts, then read retainers.
- Every subscribe in `useEffect` needs a matching unsubscribe.
- Destroy third-party instances and bound caches.
- Verify by repeating the flow and checking the heap stays flat.
