---
title: "Your React application consumes too much memory after prolonged usage. How would you debug it?"
tags: ["memory-leak", "heap-snapshot", "devtools", "debugging"]
difficulty: "hard"
---

## Short answer

Memory that keeps climbing over a long session is a leak: something keeps references alive after it is no longer needed. I reproduce it with a repeatable flow, use Chrome's Memory panel (heap snapshot comparison and "Allocations on timeline") to find which objects accumulate and what retains them, then fix the source, usually missing effect cleanups, ever-growing caches or stores, or third-party instances that are never destroyed.

## Why it happens

Long-running dashboards, chat apps and admin panels stay open for hours, so small leaks add up:

| Leak source | Example |
| --- | --- |
| Effects without cleanup | `setInterval`, `addEventListener`, WebSocket `onmessage` |
| Unbounded data | Appending every chat message or log line to state forever |
| Caches | Module-level `Map`, query cache with no garbage collection |
| Closures | Callbacks registered globally that capture large props |
| Detached DOM | Refs stored in global variables, removed nodes kept in arrays |
| Third-party | Map/chart/editor instances not `destroy()`ed |

## How to fix it

### 1. Confirm the trend

DevTools -> More tools -> **Performance monitor**: watch "JS heap size" and "DOM Nodes" while using the app. Click the GC icon in the Memory panel; if the floor keeps rising, it is a leak.

### 2. Find what is leaking

```text
Memory panel
  Snapshot 1 (after warm-up)
  -> repeat action N times (open/close modal, switch routes)
  Snapshot 2 -> "Comparison" view vs Snapshot 1
  Sort by "# New" / "Size Delta"
  Select an object -> "Retainers" shows the chain keeping it alive
```

"Allocations on timeline" shows blue bars that never turn gray: allocations that were never freed.

### 3. Fix the common sources

```jsx
// Unbounded list -> keep a window
function useLogStream(url, max = 1000) {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    const source = new EventSource(url);
    source.onmessage = (e) =>
      setLines((prev) => {
        const next = [...prev, e.data];
        return next.length > max ? next.slice(-max) : next;
      });
    return () => source.close(); // cleanup
  }, [url, max]);
  return lines;
}
```

```js
// Bounded server cache (TanStack Query v5)
const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: 5 * 60_000 } },
});
```

Also: clear global listeners on unmount, call `destroy()`/`dispose()` on third-party widgets, use `WeakMap` for object-keyed caches, and virtualize long lists so off-screen DOM is released.

> **💡 Interview tip:** Mention StrictMode: double-invoking effects in development surfaces missing cleanups before they reach production.

## How to verify

- Repeat the flow 20+ times: heap returns to the same baseline after GC.
- Performance monitor DOM node count stays flat.
- Run a long soak test (Playwright looping for an hour) and record `performance.memory` or `measureUserAgentSpecificMemory()` where available.

## Follow-up questions

- **Shallow size vs retained size?** Shallow is the object itself; retained is everything that would be freed if it were collected.
- **Can a closure leak memory?** Yes, if a long-lived function (global listener, timer) captures large variables.
- **Is high memory always a leak?** No. A large but stable heap is a sizing issue; a steadily rising one is a leak.

## Quick recap

- Confirm with Performance monitor and forced GC.
- Snapshot comparison + retainers find the culprit.
- Fix cleanups, cap data and caches, destroy third-party instances.
- Verify with repeated flows and soak tests.
