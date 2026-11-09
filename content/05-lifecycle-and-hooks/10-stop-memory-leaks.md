---
title: "How do you stop memory leaks in React?"
tags: ["memory-leaks", "useEffect", "cleanup", "performance"]
difficulty: "medium"
---

## Short answer

Memory leaks in React almost always come from **work that outlives the component**: timers, event listeners, subscriptions, sockets, observers, pending requests or global caches that still reference component data after unmount. Stop them by **returning a cleanup function from every effect** that starts something, aborting in-flight requests with `AbortController`, avoiding unbounded module-level caches, and verifying with Strict Mode and the browser's memory tools.

## Explanation

A leak is like leaving taps running in a house you moved out of. Unmounting removes the component from the screen, but anything it registered elsewhere (the window, a socket, a timer queue) keeps a reference to its closures, so the garbage collector cannot free that memory.

### Common sources and fixes

| Source | Leak | Fix |
|---|---|---|
| `setInterval` / `setTimeout` | Keeps firing, holds closure | `clearInterval`/`clearTimeout` in cleanup |
| `window`/`document` listeners | Listener holds component closure | `removeEventListener` with same reference, or `AbortController` `signal` |
| WebSocket / EventSource | Connection stays open | `close()` in cleanup |
| Store/pub-sub subscriptions | Callback stays registered | Call the returned unsubscribe |
| `IntersectionObserver`, `ResizeObserver`, `MutationObserver` | Observer holds DOM nodes | `disconnect()` |
| `fetch` / axios in flight | Work and setState after unmount, race conditions | `AbortController.abort()` in cleanup |
| Third-party widgets (maps, charts, editors) | Internal DOM and listeners stay alive | Call their `destroy()`/`dispose()` |
| Module-level caches / arrays | Grow forever | Bound the size, use `WeakMap`, or a proper cache library |
| Refs to detached DOM nodes stored globally | Detached DOM trees | Do not store nodes outside the component; clean refs |

### Note on the old warning

React 17 and earlier warned "Can't perform a React state update on an unmounted component". React 18 removed it because `setState` after unmount is usually harmless by itself. The real leak is the subscription or timer that keeps running; fix that, not the warning.

### How to verify

1. Keep **Strict Mode** on: it mounts, unmounts and remounts in dev; missing cleanups show up as duplicated listeners or requests.
2. Chrome DevTools **Memory** panel: take heap snapshots before and after mounting/unmounting a screen several times; look for growing "Detached" DOM nodes or retained closures.
3. **Performance monitor**: watch JS heap size and event listener count while navigating back and forth.

## Example

```jsx
import { useEffect, useState } from "react";

export default function LivePrices({ symbol }) {
  const [price, setPrice] = useState(null);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // 1. Initial fetch, aborted on unmount/symbol change
    fetch(`/api/price/${symbol}`, { signal })
      .then((r) => r.json())
      .then((d) => setPrice(d.price))
      .catch((e) => { if (e.name !== "AbortError") console.error(e); });

    // 2. Socket subscription
    const socket = new WebSocket(`wss://prices.example.com/${symbol}`);
    socket.onmessage = (e) => setPrice(JSON.parse(e.data).price);

    // 3. Listener removed automatically via the same signal
    window.addEventListener("resize", () => setWidth(window.innerWidth), { signal });

    // 4. Polling timer
    const id = setInterval(() => socket.readyState === 1 && socket.send("ping"), 30_000);

    return () => {
      controller.abort(); // cancels fetch + removes resize listener
      socket.close();
      clearInterval(id);
    };
  }, [symbol]);

  return <p>{symbol}: {price ?? "..."} (viewport {width}px)</p>;
}
```

## Common mistakes

- Using an `isMounted` flag to hide the warning while the subscription keeps running.
- Passing a new inline function to `removeEventListener`, which removes nothing.
- Disabling Strict Mode because effects "run twice".
- Storing every response in a global object without eviction.

## Follow-up questions

- **Can closures in event handlers leak?** Only if something long-lived keeps the handler referenced (a global listener or cache). React's own JSX handlers are released on unmount.
- **Do Server Components leak on the client?** They do not run on the client, but leaks can happen on the server through module-level state shared across requests.
- **How does TanStack Query help?** It cancels/ignores stale requests, garbage-collects unused cache entries after `gcTime`, and handles subscriptions for you.

## Quick recap

- Leaks = work or references that outlive the component.
- Every effect that starts something must clean it up.
- `AbortController` cancels fetches and removes listeners via `signal`.
- Verify with Strict Mode and heap snapshots.
