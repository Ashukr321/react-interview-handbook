---
title: "Why does adding a function to the dependency array cause repeated execution?"
tags: ["scenario", "useEffect", "useCallback", "dependencies", "useEffectEvent"]
difficulty: "medium"
---

## Short answer

A function declared inside a component is recreated on every render, so it is a new reference each time. Because effect dependencies are compared with `Object.is`, the effect sees a "changed" dependency after every render and runs again; if it sets state, it loops. Fix it by moving the function inside the effect, moving it outside the component, wrapping it in `useCallback` with the right dependencies, or using `useEffectEvent` for event-like logic.

## Why it happens

```jsx
function Products({ category }) {
  const [items, setItems] = useState([]);

  function load() { // new function on every render
    return fetch(`/api/products?c=${category}`).then((r) => r.json()).then(setItems);
  }

  useEffect(() => {
    load();
  }, [load]); // load#1 !== load#2 -> effect runs after every render
}
```

```text
 render 1: load#1 -> effect -> setItems -> render 2
 render 2: load#2 -> Object.is(load#1, load#2) = false -> effect -> setItems -> render 3 ...
```

Functions are objects. Two functions with identical code are like two keys cut from the same pattern: they open the same lock, but they are different keys. The same happens when a parent passes `onChange={() => ...}` and the child puts `onChange` in its effect dependencies.

## How to fix it

**1. Move the function inside the effect** (best when only the effect uses it):

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/products?c=${category}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setItems)
    .catch(() => {});
  return () => controller.abort();
}, [category]);
```

**2. Move it outside the component** if it uses no props or state:

```jsx
const fetchProducts = (c, signal) => fetch(`/api/products?c=${c}`, { signal }).then((r) => r.json());
```

**3. `useCallback`** when the function is also used elsewhere (passed to children, called from handlers):

```jsx
import { useCallback, useEffect, useState } from "react";

export function Products({ category }) {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/products?c=${category}`);
    setItems(await res.json());
  }, [category]); // same function until category changes

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <button onClick={load}>Refresh</button>
      <ul>{items.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  );
}
```

**4. `useEffectEvent` (React 19.2+)** when the function is a callback the effect should call with the latest props, but whose changes should not re-run the effect (for example a parent's `onConnected`):

```jsx
import { useEffect, useEffectEvent } from "react";

function Room({ roomId, onConnected }) {
  const handleConnected = useEffectEvent(() => onConnected(roomId));
  useEffect(() => {
    const conn = connect(roomId, () => handleConnected());
    return () => conn.close();
  }, [roomId]); // onConnected changing does not reconnect
}
```

> **⚠️ Gotcha:** `useCallback` with a missing dependency gives you a stable but stale function. Keep the lint rule on.

## How to verify

- `console.count("effect")` increments only when `category` changes.
- Network tab: one request per category change, not a flood.
- `react-hooks/exhaustive-deps` warns: "The 'load' function makes the dependencies of useEffect change on every render."

## Follow-up questions

- **Why not just leave the function out of the dependency array?** The effect then calls a stale version that captured old props; the linter flags it for a reason.
- **Does React Compiler change this?** It memoizes functions automatically, so identities stay stable when their inputs do not change; explicit `useCallback` becomes mostly unnecessary.
- **Is `setState` safe to omit from dependencies?** Yes, state setters and `dispatch` are guaranteed stable by React.

## Quick recap

- Inline functions get a new identity every render.
- New identity = changed dependency = effect re-runs.
- Move the function into the effect or outside the component.
- Use `useCallback` when it is shared, `useEffectEvent` for event-like callbacks.
