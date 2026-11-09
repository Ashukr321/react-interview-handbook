---
title: "What is memoization in React?"
tags: ["memoization", "performance", "React.memo", "react-compiler"]
difficulty: "medium"
---

## Short answer

Memoization is caching the result of a computation so it is reused when the inputs have not changed. React offers three tools: **`React.memo`** to skip re-rendering a component when its props are shallowly equal, **`useMemo`** to cache a computed value, and **`useCallback`** to cache a function reference. The **React Compiler** can now apply this automatically at build time. Memoization is an optimisation, never something your code's correctness should rely on.

## Explanation

Memoization is like a student who writes down answers to homework problems. When the same question comes up again, they look up the answer instead of solving it again. If the question changes even slightly, they solve it fresh.

### The three tools

| Tool | Caches | Skips |
|------|--------|-------|
| `React.memo(Component)` | Last rendered output | Re-rendering when props are shallowly equal |
| `useMemo(fn, deps)` | Return value of `fn` | Recomputing when deps are unchanged |
| `useCallback(fn, deps)` | The function itself | Creating a new reference when deps are unchanged |

They work together: `React.memo` compares props by reference (`Object.is`), so passing a new object or arrow function each render defeats it. `useMemo`/`useCallback` keep those references stable.

### When it helps

- A component renders often with the same props and is expensive to render (big lists, charts).
- A calculation is genuinely slow (sorting or filtering thousands of items).
- A value is used as an effect dependency or passed to a memoised child.

### When it hurts

- Cheap components and calculations: comparing deps can cost more than re-rendering.
- Props that change every render anyway (e.g. `children` JSX), so memo never hits.
- Code becomes noisier and dependency bugs creep in.

### Alternatives before memoizing

1. **Move state down** so fewer components re-render.
2. **Pass children** (lift content up) so the wrapper re-renders without re-creating them.
3. **Enable the React Compiler**, which memoizes components and values automatically.

## Example

```jsx
import { memo, useCallback, useMemo, useState } from "react";

const Row = memo(function Row({ item, onRemove }) {
  return (
    <li>
      {item.name} <button onClick={() => onRemove(item.id)}>x</button>
    </li>
  );
});

export default function Inventory({ items }) {
  const [sortAsc, setSortAsc] = useState(true);
  const [note, setNote] = useState("");
  const [removed, setRemoved] = useState(new Set());

  const sorted = useMemo(() => {
    const visible = items.filter((i) => !removed.has(i.id));
    return visible.sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
  }, [items, removed, sortAsc]);

  const handleRemove = useCallback((id) => {
    setRemoved((prev) => new Set(prev).add(id));
  }, []);

  return (
    <>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
      <button onClick={() => setSortAsc(!sortAsc)}>Toggle sort</button>
      {/* typing a note does not re-render any Row */}
      <ul>{sorted.map((item) => <Row key={item.id} item={item} onRemove={handleRemove} />)}</ul>
    </>
  );
}
```

## Common mistakes

- Wrapping every component in `memo` by default without profiling.
- Passing inline objects or functions to a memoised component, so it re-renders anyway.
- Mutating arrays in place (`items.sort()` on props) inside `useMemo`; `sort` mutates, so copy first or filter into a new array as above.
- Relying on memoization to prevent an effect from running. React may drop cached values.

## Follow-up questions

- **Does `React.memo` do a deep comparison?** No, shallow by default; you can pass a custom `arePropsEqual` as the second argument.
- **Does context bypass `memo`?** Yes. A memoised component that reads a changed context still re-renders.
- **What does the React Compiler change?** It analyses components at build time and inserts fine-grained memoization, making manual `memo`/`useMemo`/`useCallback` mostly unnecessary.

## Quick recap

- Memoization caches results for unchanged inputs.
- `React.memo` for components, `useMemo` for values, `useCallback` for functions.
- Profile first; restructure state before memoizing.
- The React Compiler automates most of it.
