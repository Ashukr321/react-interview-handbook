---
title: "Can transitions replace debouncing?"
tags: ["transitions", "debounce", "performance", "comparison"]
difficulty: "medium"
---

## Short answer

Only partly. Transitions (and `useDeferredValue`) replace debouncing for **CPU-bound rendering** problems, like filtering a big list, because they adapt to device speed and are interruptible. They do **not** replace debouncing for **side effects**, like API calls or analytics, because React still runs your code on every change. For search-as-you-type against a server, you typically use both.

## Explanation

Debouncing says "wait until the user stops for 300 ms, then do the work once". Transitions say "start the work now, but drop it if something more important comes in".

Analogy: debouncing is a waiter who waits until the whole table has finished ordering. Transitions are a chef who starts cooking right away but happily throws away a half-cooked dish if the order changes.

| Concern | Debounce | Transition / deferred value |
|---|---|---|
| Delay | Fixed, always paid | None on fast devices |
| Slow devices | Still freezes when the work runs | Stays responsive (yields) |
| Network requests | Fewer requests | Same number of requests |
| Intermediate results | Never shown | May be skipped if superseded |
| Pending state | Manual | `isPending` / stale comparison |
| Works outside React | Yes | No, React rendering only |

### Rules of thumb

- Heavy local rendering (filter, sort, chart redraw): use `useDeferredValue` or `useTransition`. No artificial delay needed.
- Server requests on each keystroke: debounce the request (or the query key) to save bandwidth and rate limits.
- Both heavy rendering and server data: debounce the fetch, and render results in a transition so the UI stays responsive.

## Example

```jsx
import { useEffect, useState, useDeferredValue } from "react";

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Search() {
  const [text, setText] = useState("");
  const debouncedText = useDebounced(text); // limits API calls
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!debouncedText) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedText)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedText]);

  const deferredResults = useDeferredValue(results); // keeps big render interruptible

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <ResultsGrid items={deferredResults} />
    </>
  );
}
```

## Common mistakes

- Replacing a debounced fetch with `useDeferredValue` and then wondering why the server gets a request per keystroke.
- Debouncing purely local filtering, adding 300 ms of lag even on fast machines.
- Debouncing the input's own value, which makes typing feel broken.
- Forgetting to cancel stale requests, so out-of-order responses overwrite newer results.

## Follow-up questions

- **What about throttling?** Throttling suits continuous events (scroll, resize). Transitions don't throttle; they prioritize.
- **Does TanStack Query remove the need to debounce?** No. It caches and dedupes by key, but every new key still triggers a fetch unless you debounce the key.
- **Is `useDeferredValue` a debounce with zero delay?** Not quite. It renders twice and can interrupt the second render; debounce never starts work until the timer fires.

## Quick recap

- Transitions fix render-bound lag without fixed delays.
- Debounce still needed to limit network and side effects.
- Combine them for server-backed search.
- Always cancel or ignore stale requests.
