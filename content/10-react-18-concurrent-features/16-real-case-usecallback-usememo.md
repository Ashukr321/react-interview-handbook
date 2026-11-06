---
title: "What is a real case for useCallback + useMemo?"
tags: ["usecallback", "usememo", "memo", "performance"]
difficulty: "medium"
---

## Short answer

The classic real case is a **large memoized list** inside a parent that re-renders often. `useMemo` caches an expensive derived value (filtering/sorting thousands of rows) and `useCallback` keeps the event handler passed to `memo` rows referentially stable. Without both, `React.memo` on the rows is useless, because a new array or function reference is created on every parent render. With the React Compiler (stable in 2025), much of this is done automatically.

## Explanation

`memo` skips a child's render only if all props are shallowly equal (`Object.is`). Functions and arrays created during render are new every time, so they always fail that check.

Analogy: a security guard (memo) lets you in without a check only if your badge is the exact same badge as yesterday. A freshly printed badge with the same name still gets checked.

### When they genuinely help

| Situation | Hook |
|---|---|
| Expensive calculation (sort/filter 10k items, heavy parsing) | `useMemo` |
| Function passed to a `memo` child | `useCallback` |
| Object/array passed to a `memo` child | `useMemo` |
| Value used in another hook's dependency array (`useEffect`) | `useMemo` / `useCallback` |
| Context value object | `useMemo` (prevents re-rendering all consumers) |

### When they don't

- Child isn't wrapped in `memo`: a stable callback changes nothing.
- Cheap computations: memoization overhead and complexity cost more than they save.
- Dependencies change every render anyway.

## Example

```jsx
import { useState, useMemo, useCallback, memo } from "react";

function OrdersPage({ orders }) {
  // 5,000 orders
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [selected, setSelected] = useState(new Set());
  const [, setClock] = useState(0); // something unrelated that re-renders the page

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return orders
      .filter((o) => o.customer.toLowerCase().includes(q))
      .sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1));
  }, [orders, search, sortBy]); // recomputed only when these change

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []); // stable: updater form avoids depending on "selected"

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="date">Date</option>
        <option value="total">Total</option>
      </select>
      <button onClick={() => setClock((c) => c + 1)}>Refresh clock</button>
      {visible.map((o) => (
        <OrderRow
          key={o.id}
          order={o}
          checked={selected.has(o.id)}
          onToggle={toggle}
        />
      ))}
    </>
  );
}

const OrderRow = memo(function OrderRow({ order, checked, onToggle }) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={() => onToggle(order.id)} />
      {order.customer} - {order.total}
    </label>
  );
});
```

Clicking one checkbox now re-renders only that row, and clicking "Refresh clock" re-renders no rows and skips the sort.

## Common mistakes

- Wrapping every function in `useCallback` "just in case" without a `memo` consumer.
- Passing inline objects (`style={{...}}`) to memo rows, breaking memoization anyway.
- Missing dependencies, causing stale closures. Use the updater form or keep the ESLint hooks rule on.
- Treating `useMemo` as a semantic guarantee. React may discard cached values; it is a performance hint.

## Follow-up questions

- **How do you prove it helps?** Use the React DevTools Profiler to compare commit times and which components rendered.
- **What does the React Compiler change?** It auto-memoizes components and values at build time, so manual `useMemo`/`useCallback` become mostly unnecessary in compiled code.
- **`useCallback(fn, deps)` vs `useMemo(() => fn, deps)`?** Equivalent; `useCallback` is shorthand for memoizing functions.

## Quick recap

- `memo` needs stable props to work.
- `useMemo` for expensive derived data and stable objects.
- `useCallback` for stable handlers passed to memo children.
- Measure with the Profiler before and after.
- React Compiler automates most of this.
