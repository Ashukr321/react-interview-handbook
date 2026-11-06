---
title: "You accidentally use random keys (Math.random()) in a list. What happens internally?"
tags: ["keys", "reconciliation", "lists", "bugs"]
difficulty: "medium"
---

## Short answer

Every render generates new keys, so React finds **no matching Fiber** for any item. It treats every old item as removed and every new item as new: it unmounts all rows (running cleanups and destroying state), throws away their DOM nodes, then creates fresh Fibers and DOM nodes and mounts them again. The visible symptoms are lost input values, lost focus and scroll position, effects re-running, animations restarting, and poor performance.

## Why it happens

React identifies a child by **type + key** among its siblings. The key is how React says "this is the same item as last time".

```text
Render 1: [li key=0.42] [li key=0.17] [li key=0.88]
Render 2: [li key=0.05] [li key=0.61] [li key=0.93]

Reconcile:
  0.42, 0.17, 0.88 → not found in new list → DELETE (unmount, cleanup, remove DOM)
  0.05, 0.61, 0.93 → not found in old list → PLACEMENT (create Fiber, create DOM, mount)
```

Internally, React tries to match the children in order, sees the keys differ, builds a map of the remaining old children by key, and looks up each new child. With random keys, every lookup misses.

| Concern | Stable key (`item.id`) | `Math.random()` key |
| --- | --- | --- |
| DOM nodes | Reused, patched | Destroyed and recreated |
| Component state | Preserved | Reset every render |
| Effects | Re-run only on dep change | Cleanup + mount every render |
| Focus / selection / scroll inside rows | Kept | Lost |
| CSS transitions | Smooth | Restart or flicker |
| Cost | Minimal diffs | Full rebuild |

It's a silent bug: there's no warning, because the keys *are* unique.

## How to fix it

1. Use a stable id from the data (database id, slug, UUID assigned **once** at creation).
2. If the data has no id, assign one when the item is created or fetched, never during render.
3. Use the index only for static lists that never reorder, insert or delete.

```jsx
import { useState } from "react";

export default function Todos() {
  const [todos, setTodos] = useState([]);

  function add(title) {
    // ✅ id created once, when the item is created
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), title }]);
  }

  return (
    <>
      <button onClick={() => add("New task")}>Add</button>
      <ul>
        {todos.map((t) => (
          // ❌ key={Math.random()} would remount every row on each render
          <li key={t.id}>
            <input defaultValue={t.title} />
          </li>
        ))}
      </ul>
    </>
  );
}
```

With random keys, typing in one input and then clicking "Add" would wipe every input's text, because each `<input>` is a new DOM node.

> **⚠️ Gotcha:** `crypto.randomUUID()` is fine at creation time, but calling it *inside* `map` is exactly as broken as `Math.random()`.

## How to verify

- Add `useEffect(() => { console.log("mount"); return () => console.log("unmount"); }, [])` in the row: random keys log unmount/mount for every row on each render.
- The Elements panel shows every `<li>` replaced (the whole list flashes).
- The Profiler shows every row as newly mounted.

## Follow-up questions

- **Can random keys ever be intentional?** Changing a key *deliberately* (e.g. `key={userId}`) to reset a component is a valid pattern, but it should be tied to data, not random.
- **Do keys need to be globally unique?** No, only unique among siblings.
- **Is `key` passed as a prop?** No. It's reserved for React and not readable via `props.key`.

## Quick recap

- Random keys mean no Fiber matches, so everything is unmounted and remounted.
- State, focus and DOM nodes are lost on every render.
- Keys must be stable, unique among siblings, and derived from the data.
- Generate ids at creation time, never during render.
