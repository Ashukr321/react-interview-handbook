---
title: "Your effect depends on an object that changes every render. How do you solve it?"
tags: ["scenario", "useEffect", "dependencies", "referential-equality", "useMemo"]
difficulty: "medium"
---

## Short answer

React compares dependencies with `Object.is`, so an object literal created during render is "different" every time and the effect re-runs on every render. Fix it by depending on the primitive fields you actually use, creating the object inside the effect, moving a static object outside the component, or memoizing it with `useMemo` (in the component that creates it, often the parent).

## Why it happens

`{ a: 1 } === { a: 1 }` is `false`. Two objects with the same content are still two different objects, like two identical printed forms: same text, different sheets of paper.

```jsx
function ChatRoom({ roomId }) {
  const options = { serverUrl: "https://chat.example.com", roomId }; // new object each render
  useEffect(() => {
    const conn = createConnection(options);
    conn.connect();
    return () => conn.disconnect();
  }, [options]); // changes every render -> reconnect on every keystroke anywhere above
}
```

```text
 render 1: options#A -> effect runs
 render 2: options#B -> Object.is(A, B) = false -> cleanup + effect again
 render 3: options#C -> ... again
```

The same happens with props: `<Map options={{ zoom: 5 }} />` gives the child a new object each parent render.

## How to fix it

Pick the first option that fits:

1. **Depend on primitives** used by the effect.
2. **Create the object inside the effect**.
3. **Move static objects outside the component**.
4. **`useMemo`** when the object must be shared or passed down.
5. For object props, **destructure primitives** in the child or ask the parent to memoize.

```jsx
import { useEffect, useMemo } from "react";

const SERVER_URL = "https://chat.example.com"; // 3. static, defined once

export function ChatRoom({ roomId, settings }) {
  // 2. object created inside the effect, deps are primitives (1)
  useEffect(() => {
    const conn = createConnection({ serverUrl: SERVER_URL, roomId });
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]);

  // 5. object prop: depend on the fields, not the object
  const { theme, fontSize } = settings;
  useEffect(() => {
    applyEditorSettings({ theme, fontSize });
  }, [theme, fontSize]);

  // 4. memoize when the object is needed by several hooks or children
  const filters = useMemo(() => ({ roomId, unreadOnly: true }), [roomId]);
  return <MessageList filters={filters} />;
}

function createConnection({ serverUrl, roomId }) {
  return {
    connect: () => console.log("connect", serverUrl, roomId),
    disconnect: () => console.log("disconnect", roomId),
  };
}
function applyEditorSettings(s) { console.log("apply", s); }
function MessageList({ filters }) { return <p>Room {filters.roomId}</p>; }
```

> **⚠️ Gotcha:** `JSON.stringify(obj)` as a dependency "works" but is slow for large objects, breaks on key order changes and hides the real design problem. Prefer primitives.

## How to verify

- Add `console.log("effect ran")`: it should log only when `roomId` (or the relevant fields) change, not on unrelated state changes.
- React DevTools Profiler shows renders but the connection logs stay quiet.
- `react-hooks/exhaustive-deps` warns: "The 'options' object makes the dependencies of useEffect change on every render."

## Follow-up questions

- **Does React Compiler solve this?** It automatically memoizes objects created during render, so in compiled code `options` keeps its identity while inputs are unchanged; it is still cleaner to depend on primitives.
- **What about arrays from props like `ids`?** Same issue; depend on a stable key such as `ids.join(",")` only if the array is small, or have the source memoize it.
- **Why not just remove the dependency?** It hides a stale-closure bug: the effect would keep using the first render's values.

## Quick recap

- Dependencies use `Object.is`; new objects always differ.
- Prefer primitive dependencies.
- Create objects inside the effect or outside the component.
- `useMemo` (or React Compiler) to stabilize objects that must be shared.
