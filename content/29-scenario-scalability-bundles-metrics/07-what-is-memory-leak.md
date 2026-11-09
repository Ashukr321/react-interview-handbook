---
title: "What is a memory leak?"
tags: ["memory-leak", "garbage-collection", "useEffect", "performance"]
difficulty: "easy"
---

## Short answer

A memory leak happens when an application keeps references to memory it no longer needs, so the garbage collector cannot free it. Memory use keeps growing over time, which makes the app slower and can eventually crash the tab. In React apps, leaks usually come from effects that subscribe to something (timers, listeners, sockets) without cleaning up when the component unmounts.

## Explanation

JavaScript frees memory automatically: the garbage collector removes objects that are no longer reachable from "roots" like global variables, the current call stack and active closures. A leak is not "forgetting to free" as in C; it is accidentally keeping something reachable.

Real-life analogy: a library that never gets books back. Each borrower keeps a book "just in case", so the shelves empty even though nobody is reading them.

### Common causes

| Cause | Why it leaks |
| --- | --- |
| Timers (`setInterval`) not cleared | Callback and its closure stay alive forever |
| Event listeners on `window`/`document` not removed | Listener references the component's state |
| Subscriptions (WebSocket, store, observables) | Source keeps a reference to the handler |
| Global caches / arrays that only grow | Data is always reachable |
| Detached DOM nodes | Removed from the page but still referenced in JS |
| Third-party instances not destroyed | Maps and charts hold DOM and data |

### Symptoms

- Heap size climbs and never returns after garbage collection.
- The app gets slower the longer it is open; GC pauses get longer.
- Mobile browsers reload or crash the tab.

### How to find it

```text
DevTools -> Memory -> Heap snapshot
  -> repeat an action several times
  -> second snapshot -> "Comparison" view
  -> objects that keep increasing + their "Retainers"
```

## Example

```jsx
// Leaky: listener and interval survive unmount
function LiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("focus", () => setNow(Date.now()));
  }, []);
  return <time>{new Date(now).toLocaleTimeString()}</time>;
}

// Fixed: every subscription has a cleanup
function LiveClockFixed() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return <time>{new Date(now).toLocaleTimeString()}</time>;
}
```

> **⚠️ Gotcha:** `removeEventListener` needs the same function reference you passed to `addEventListener`. An inline arrow function cannot be removed.

## Common mistakes

- Thinking garbage collection makes leaks impossible in JavaScript.
- Treating high but stable memory as a leak; a leak is memory that keeps growing.
- Removing a listener with a different (new) function reference.
- Ignoring StrictMode's double effect run in development, which is there to expose missing cleanups.

## Follow-up questions

- **How does `WeakMap` help?** Its keys are held weakly, so entries are collected when the key object is no longer used elsewhere.
- **What is a detached DOM node?** A node removed from the document but still referenced by JavaScript.
- **How do you cancel a fetch on unmount?** Use an `AbortController` and call `abort()` in the effect cleanup.

## Quick recap

- A leak is memory kept reachable after it is no longer needed.
- Common sources: timers, listeners, subscriptions, growing caches, detached DOM.
- In React, return a cleanup from every subscribing effect.
- Find leaks with heap snapshot comparison and retainers.
