---
title: "What happens if keys are unstable?"
tags: ["keys", "reconciliation", "bugs", "performance"]
difficulty: "medium"
---

## Short answer

If a key changes between renders for the same logical item, React treats it as a different element: it unmounts the old fiber (running cleanup, destroying state and the DOM node) and mounts a new one. With keys like `Math.random()` or `Date.now()`, every item remounts on every render, which wastes work, resets input/focus/scroll state, re-runs effects, and restarts animations.

## Explanation

React's list diff looks up each new child by key in a map of old fibers. An unstable key never finds a match, so:

| Consequence | Why |
|---|---|
| State resets | `useState`, `useRef` values live on the fiber that was deleted |
| Focus and cursor lost | The `<input>` DOM node is destroyed and recreated |
| Effects re-run | Cleanup runs on unmount, setup runs on mount (extra fetches, subscriptions) |
| Slow renders | Full mount of every row instead of a cheap prop update |
| Animations flicker | CSS transitions restart on new nodes |
| Uncontrolled inputs clear | Their value lived only in the old DOM node |

Analogy: a hotel that issues every guest a new room number each morning. Nobody can find their luggage.

### Sources of unstable keys

- `Math.random()`, `crypto.randomUUID()` or `Date.now()` called **during render**.
- Keys derived from mutable fields (e.g. `key={item.name}` when the name is editable).
- Index keys when the list is reordered, filtered or prepended (the key stays but now points to a different item, which is the opposite bug: wrong state reused).
- Duplicate keys, which make React warn and can drop or duplicate items.

```text
Render 1: key=0.42 -> fiber A (state: "hello")
Render 2: key=0.87 -> no match -> delete A, create B (state: "")
```

## Example

```jsx
import { useState } from "react";

// Bad: new key every render -> every input remounts, typing loses focus
function BadList({ items }) {
  return items.map((item) => <input key={Math.random()} defaultValue={item.text} />);
}

// Good: stable id, generated once when the item is created
export default function GoodList() {
  const [items, setItems] = useState(() => [{ id: crypto.randomUUID(), text: "" }]);

  const add = () => setItems((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);

  return (
    <>
      {items.map((item) => (
        <input key={item.id} defaultValue={item.text} />
      ))}
      <button onClick={add}>Add</button>
    </>
  );
}
```

## Common mistakes

- Thinking "unique" is enough. Keys must also be **stable** across renders.
- Generating IDs inside `map` instead of when the data is created or fetched.
- Using a field the user can edit as the key.

> **⚠️ Gotcha:** The bug often shows up as "my input loses focus after each keystroke". That's a remount, usually from an unstable key or a component defined inside another component.

## Follow-up questions

- **What if the data has no id?** Create one when the data enters your app (on fetch or on add), and store it with the item.
- **Are duplicate keys an error?** React warns in development; behavior is undefined and items may be skipped or duplicated.
- **Is an intentionally changing key ever useful?** Yes, to reset a component, e.g. `key={selectedUserId}` on a form.

## Quick recap

- Changing key = different element = unmount + mount.
- Unstable keys lose state, focus, and re-run effects.
- They also cost performance on every render.
- Generate ids once, with the data, never during render.
