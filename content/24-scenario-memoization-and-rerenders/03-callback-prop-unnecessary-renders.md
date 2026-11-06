---
title: "A callback prop causes unnecessary renders. How would you fix it?"
tags: ["usecallback", "react-memo", "callbacks", "re-renders"]
difficulty: "medium"
---

## Short answer

An inline function such as `onClick={() => remove(id)}` is a new function on every parent render, so a `memo`-wrapped child sees a changed prop and re-renders. Fix it by giving the callback a stable identity with `useCallback`, using functional state updates so it needs fewer dependencies, or letting the React Compiler do it automatically. `useCallback` only helps if the child is memoized (or the function is an effect dependency).

## Why it happens

Functions are objects in JavaScript, and `() => {}` !== `() => {}`. Each render runs the component body again and creates fresh closures.

```text
Parent render #1 ──► onDelete = fn#1 ──► <Row memo> renders
Parent render #2 ──► onDelete = fn#2 ──► Object.is(fn#1, fn#2) = false ──► <Row> renders again
```

`useCallback` alone does nothing if the child isn't wrapped in `memo`. A non-memoized child re-renders whenever its parent does, whatever its props are.

## How to fix it

1. **Memoize the child** with `memo`.
2. **Stabilize the callback** with `useCallback`.
3. **Shrink dependencies** with functional updates, so the callback doesn't change whenever state changes.
4. **Pass the id up** instead of creating a closure per row.

```jsx
import { memo, useCallback, useState } from "react";

const TodoRow = memo(function TodoRow({ todo, onToggle }) {
  return (
    <li>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
      />
      {todo.title}
    </li>
  );
});

export default function TodoList({ initial }) {
  const [todos, setTodos] = useState(initial);

  // Functional update means no `todos` dependency, so the identity never changes
  const handleToggle = useCallback((id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  return (
    <ul>
      {todos.map((t) => (
        <TodoRow key={t.id} todo={t} onToggle={handleToggle} />
      ))}
    </ul>
  );
}
```

Now toggling one todo re-renders only that row: its `todo` object changed, and every other row keeps the same `todo` and `onToggle` references.

### When the callback needs fresh values

If a callback has to read the latest props or state but must keep a stable identity, keep the value in a ref or use `useEffectEvent` (stable in React 19.2) for effect-related logic. Don't add the value to the deps and lose stability.

> **💡 Interview tip:** With the **React Compiler**, the inline `onChange={() => onToggle(todo.id)}` and the parent's handler are memoized at build time, so you rarely write `useCallback` by hand.

## How to verify

- React DevTools Profiler: before the fix, all rows light up on a single toggle; after it, only one does.
- "Why did this render?" should no longer list `onToggle`.

## Follow-up questions

- **What's the difference between `useCallback(fn, deps)` and `useMemo(() => fn, deps)`?** None. `useCallback` is shorthand for memoizing a function.
- **Can an empty deps array cause bugs?** Yes. If the callback reads state directly (not through a functional update), it captures a stale value.
- **Should every handler be wrapped?** No. Only those passed to memoized children or used in effect dependencies.

## Quick recap

- Inline functions are new on every render.
- `useCallback` + `memo` together stop the extra renders.
- Functional updates keep the deps array small.
- The React Compiler automates this pattern.
