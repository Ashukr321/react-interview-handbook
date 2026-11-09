---
title: "An event listener always logs outdated data. Why?"
tags: ["scenario", "stale-closure", "event-listeners", "useEffect"]
difficulty: "medium"
---

## Short answer

The listener was registered with `addEventListener` inside an effect that ran only once (`[]` dependencies), so the handler function is the closure from the first render and sees that render's state forever. Fix it by re-subscribing when the data changes (add it to dependencies with a cleanup that removes the old listener), by reading the latest value from a ref, or with `useEffectEvent` in React 19.2+.

## Why it happens

React's own `onClick` props are replaced on every render, so they always see fresh state. A native listener added with `window.addEventListener` is a function you handed to the browser once; React never swaps it for you.

```text
 Render 1: items = []      -> effect adds handleKey (captures items = [])
 Render 2: items = [a]     -> effect skipped ([] deps)
 Render 3: items = [a, b]  -> effect skipped
 Press Escape -> browser calls the Render 1 handleKey -> logs []
```

```jsx
function BuggyCart() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") console.log("Items:", items); // always []
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  // ...
}
```

## How to fix it

**Option 1: re-subscribe when the data changes.** Simple and correct; fine for cheap listeners.

```jsx
useEffect(() => {
  function handleKey(e) {
    if (e.key === "Escape") console.log("Items:", items);
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey); // removes the stale one
}, [items]);
```

**Option 2: `useEffectEvent` (React 19.2+).** Subscribe once, always read fresh values.

```jsx
import { useEffect, useEffectEvent, useState } from "react";

export function Cart() {
  const [items, setItems] = useState([]);

  const onEscape = useEffectEvent(() => {
    console.log("Items:", items); // latest items
  });

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return <button onClick={() => setItems((i) => [...i, `item-${i.length + 1}`])}>Add ({items.length})</button>;
}
```

**Option 3: a ref that mirrors the latest value** (works on older React versions).

```jsx
const itemsRef = useRef(items);
useEffect(() => { itemsRef.current = items; }, [items]);
// inside the once-registered handler: console.log(itemsRef.current)
```

> **⚠️ Gotcha:** `removeEventListener` must receive the exact same function reference that was added. Defining the handler inside the effect guarantees that.

## How to verify

- Add items, press Escape: the log shows the current list.
- In DevTools, run `getEventListeners(window).keydown` in the Console to confirm only one listener exists (no leak from repeated subscriptions).
- The exhaustive-deps lint rule should be clean.

## Follow-up questions

- **Why do React's `onClick` handlers not have this problem?** React attaches one root listener and calls the handler from the latest render's props, so it always sees current state.
- **Is re-subscribing on every change expensive?** For a keydown listener, no. For costly subscriptions (WebSocket, chat room), prefer `useEffectEvent` or a ref to avoid reconnecting.
- **Same issue with third-party libraries?** Yes: map libraries, chart callbacks and SDK listeners registered once all capture stale closures.

## Quick recap

- Native listeners added once keep the first render's closure.
- Re-subscribe with the right dependencies and cleanup.
- Or use `useEffectEvent` / a ref to read the latest value.
- Always remove the same function reference you added.
