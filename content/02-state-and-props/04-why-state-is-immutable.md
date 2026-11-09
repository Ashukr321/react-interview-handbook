---
title: "Why is state immutable in React?"
tags: ["state", "immutability", "performance"]
difficulty: "medium"
---

## Short answer

React treats state as immutable because it detects changes by **reference comparison** (`Object.is`), not by deep inspection. If you mutate an object or array in place, the reference stays the same, so React may skip the re-render, and optimisations like `React.memo`, `useMemo` and effect dependencies stop working correctly. Creating a new object for each change makes updates cheap to detect, predictable, and safe for concurrent rendering.

## Explanation

Imagine a library tracking which books changed by checking the **barcode** (reference). If you scribble in a book (mutation), the barcode is the same, so nobody notices. If you replace it with a new edition (new object), the new barcode is noticed instantly.

### Reasons immutability matters

| Reason | Explanation |
|--------|-------------|
| Change detection | `setState(sameRef)` is treated as "no change" and may bail out of rendering |
| Memoization | `React.memo`, `useMemo`, `useCallback` and effect deps compare by reference |
| Predictability | Each render sees a consistent snapshot of state |
| Concurrent rendering | React may render with a state snapshot, pause, and resume; mutations would corrupt in-progress work |
| Debugging and time travel | Old snapshots stay intact (Redux DevTools relies on this) |
| Undo/redo | Keep previous versions cheaply |

### Immutable update patterns

| Operation | Mutating (avoid) | Immutable |
|-----------|------------------|-----------|
| Add to array | `arr.push(x)` | `[...arr, x]` |
| Remove | `arr.splice(i, 1)` | `arr.filter((_, idx) => idx !== i)` |
| Update item | `arr[i].done = true` | `arr.map(t => t.id === id ? { ...t, done: true } : t)` |
| Sort | `arr.sort()` | `arr.toSorted()` or `[...arr].sort()` |
| Update object | `obj.name = "x"` | `{ ...obj, name: "x" }` |
| Nested | `user.address.city = "x"` | `{ ...user, address: { ...user.address, city: "x" } }` |

For deeply nested state, **Immer** (built into Redux Toolkit, or `use-immer`) lets you write mutating-style code that produces immutable updates.

## Example

```jsx
import { useState } from "react";

export default function Todos() {
  const [todos, setTodos] = useState([{ id: 1, text: "Learn React", done: false }]);

  // Bug: mutates in place, same reference, UI may not update
  const toggleWrong = (id) => {
    const todo = todos.find((t) => t.id === id);
    todo.done = !todo.done;
    setTodos(todos);
  };

  // Correct: new array and new object for the changed item
  const toggle = (id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id} onClick={() => toggle(t.id)}>
          {t.done ? "[x]" : "[ ]"} {t.text}
        </li>
      ))}
    </ul>
  );
}
```

## Common mistakes

- `push`, `splice`, `sort` or `reverse` on a state array before setting it.
- Shallow copying the outer object but mutating a nested one (`{ ...user }` then `copy.address.city = ...`).
- Deep cloning the entire state (`structuredClone`) on every change, which breaks memoization for unchanged parts and wastes work.
- Thinking `const` makes state immutable; it only prevents reassignment of the variable.

## Follow-up questions

- **Is it React that enforces immutability?** No, it is a convention React relies on. Tools like Immer or `Object.freeze` in development help enforce it.
- **Why not just deep compare?** Deep comparison is slow on large trees; reference checks are O(1).
- **How does Redux Toolkit let you write `state.push()`?** Its reducers run inside Immer, which records changes on a draft and returns a new immutable object.

## Quick recap

- React detects changes by reference, so mutate-in-place may not re-render.
- Immutability keeps memoization, effects and concurrent rendering correct.
- Use spreads, `map`, `filter`, `toSorted` for updates.
- Immer simplifies nested immutable updates.
