---
title: "How to optimize event handlers in React?"
tags: ["events", "performance", "debounce", "useCallback"]
difficulty: "medium"
---

## Short answer

Keep handlers light, and optimize only what profiling shows. The main tools are: **stable references** (`useCallback` or React Compiler) when handlers go to memoized children; **debounce/throttle** for high-frequency events like typing, scroll and resize; **`startTransition`/`useDeferredValue`** so expensive updates do not block input; **passive native listeners** for scroll/touch; and **moving heavy work** out of the handler (web workers, memoized computation, server).

## Explanation

An event handler is like a doorman: if he insists on a long conversation with each guest, a queue builds up. Make him quick, let him wave through repeated visitors (throttle), and hand heavy jobs to someone in the back room.

| Problem | Technique |
|---|---|
| Memoized children re-render because handler identity changes | `useCallback`, or React Compiler auto-memoization |
| Handler fires 60+ times per second (scroll, resize, mousemove) | Throttle, or `requestAnimationFrame` |
| Every keystroke triggers a fetch | Debounce + `AbortController` |
| Update causes an expensive re-render that blocks typing | `startTransition` or `useDeferredValue` |
| Thousands of rows each need a handler | One handler with `data-id`, plus list virtualization |
| Scroll jank from touch/wheel listeners | Passive listeners (`{ passive: true }`) |
| Heavy computation in handler | Move to a worker, memoize, or do it on the server |
| Handler needs latest state inside an effect subscription | `useEffectEvent` (React 19.2) instead of re-subscribing |

### Debounce correctly in React

Create the debounced function **once** (with `useMemo` or a ref), not on every render, and cancel it on unmount. Otherwise each render creates a fresh debounce timer and the debounce does nothing.

## Example

```jsx
import { useEffect, useMemo, useState, useTransition } from "react";

function debounce(fn, ms) {
  let t;
  const d = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
}

export default function ProductSearch({ allProducts }) {
  const [text, setText] = useState("");
  const [filtered, setFiltered] = useState(allProducts);
  const [isPending, startTransition] = useTransition();

  // Created once; survives re-renders
  const logSearch = useMemo(
    () => debounce((q) => fetch(`/api/log?q=${encodeURIComponent(q)}`), 500),
    []
  );
  useEffect(() => () => logSearch.cancel(), [logSearch]);

  function handleChange(e) {
    const q = e.target.value;
    setText(q); // urgent: keep the input responsive
    startTransition(() => {
      setFiltered(allProducts.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())));
    });
    logSearch(q);
  }

  return (
    <>
      <input value={text} onChange={handleChange} />
      {isPending && <small>Updating...</small>}
      <ul>{filtered.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  );
}
```

## Common mistakes

- Wrapping every handler in `useCallback` without a memoized consumer; it adds cost and noise.
- Defining `debounce(fn)` directly in the component body, so a new debounced function is created each render.
- Forgetting to cancel debounced/throttled calls on unmount, causing updates after unmount.
- Doing synchronous heavy work (sorting 100k items) inside `onChange`.

## Follow-up questions

- **Debounce vs throttle?** Debounce waits until events stop for N ms (search input); throttle runs at most once per N ms (scroll position).
- **`useDeferredValue` vs `startTransition`?** `startTransition` wraps the update you control; `useDeferredValue` defers a value you receive (e.g. a prop) so expensive children render with a lagging copy.
- **Does React Compiler remove the need for `useCallback`?** Mostly, for code it can analyze; it memoizes handlers and JSX automatically.

## Quick recap

- Measure first with the React Profiler.
- Stable references only where memoized children need them.
- Debounce/throttle high-frequency events; create them once.
- Use transitions for expensive, non-urgent updates.
