---
title: "When would useDeferredValue be a better choice than debouncing?"
tags: ["usedeferredvalue", "debounce", "concurrent", "performance"]
difficulty: "medium"
---

## Short answer

Use `useDeferredValue` when the bottleneck is **rendering** on the client, such as filtering or re-rendering a big list or chart. It adapts to the device (no artificial delay on fast machines), and the deferred render is interruptible, so it never blocks typing. Use debouncing when the bottleneck is **side effects you want to happen less often**, like network requests, analytics or autosave, because `useDeferredValue` doesn't reduce how many times the work is attempted.

## Why it happens

Debouncing waits a *fixed* time after the last keystroke, then runs the work, which still blocks the main thread if it's heavy:

```text
Debounce 300ms:
  type "r-e-a-c-t" ─► wait 300ms ─► [heavy render 200ms, blocks input] ─► paint
  fast laptop: an unnecessary 300ms lag; slow phone: still janky once it fires

useDeferredValue:
  type "r" ─► urgent render (input) ─► background render("r")
  type "e" ─► interrupt, background render("re") ...
  fast laptop: results update almost instantly; slow phone: lags gracefully, never blocks typing
```

| | `useDeferredValue` | Debounce |
| --- | --- | --- |
| Delay | Adaptive to the device | Fixed (e.g. 300 ms) |
| Blocks input when work runs? | No, the render is interruptible | Yes, if the work is heavy |
| Reduces network calls | No | Yes |
| Works on | React rendering | Any function |
| Shows intermediate results | Yes, when the device keeps up | Only after the pause |

## How to fix it

Pick by bottleneck, and often combine the two.

```jsx
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";

const LocalResults = memo(function LocalResults({ items, query }) {
  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );
  return <ul>{filtered.map((i) => <li key={i.id}>{i.name}</li>)}</ul>;
});

export default function Search({ items }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query); // ✅ client-side render cost
  const [suggestions, setSuggestions] = useState([]);

  // ✅ debounce the network side effect
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then(setSuggestions)
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>Suggestions: {suggestions.length}</p>
      <LocalResults items={items} query={deferredQuery} />
    </>
  );
}
```

> **💡 Interview tip:** `useDeferredValue` only helps if the expensive child is memoized (`memo` or the React Compiler); otherwise it re-renders on the urgent pass too.

## How to verify

- On a fast machine, results with `useDeferredValue` appear without the 300 ms debounce lag.
- With 6x CPU throttling, typing stays smooth (no long tasks during keystrokes).
- The Network panel shows debounced requests, one per pause rather than one per keystroke.

## Follow-up questions

- **Does `useDeferredValue` cancel work?** It abandons stale *renders*. It doesn't cancel fetches or effects; use `AbortController` for those.
- **What's the second argument in React 19?** `useDeferredValue(value, initialValue)` renders `initialValue` first (useful for SSR and first paint), then the real value in the background.
- **And throttling?** Throttling suits continuous streams (scroll, resize, sockets) where you want regular updates, not just the final one.

## Quick recap

- Rendering is the bottleneck → `useDeferredValue`.
- Side effects or network → debounce (or throttle).
- Deferred renders adapt to the device and never block input.
- Combine both in search-as-you-type UIs.
