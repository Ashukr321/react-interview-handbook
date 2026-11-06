---
title: "What is the difference between useMemo and useCallback?"
tags: ["hooks", "useMemo", "useCallback", "performance"]
difficulty: "medium"
---

## Short answer

Both cache something between renders until their dependencies change. `useMemo(fn, deps)` calls `fn` and caches its **return value**. `useCallback(fn, deps)` caches the **function itself**. In fact `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. Use `useMemo` for expensive calculations or stable object references, and `useCallback` for stable callbacks passed to memoised children or used as effect dependencies.

## Explanation

`useMemo` is like saving the answer to a long maths problem. `useCallback` is like saving the phone number of the person who can solve it: you keep the same contact instead of writing a new card each time.

| | `useMemo` | `useCallback` |
|---|-----------|---------------|
| Caches | Result of calling the function | The function reference |
| Returns | A value | A function |
| Typical use | Expensive computation, stable object/array props | Handler props for `React.memo` children, effect deps |
| Equivalent | `useMemo(() => compute(a), [a])` | `useMemo(() => fn, deps)` |

### Why reference stability matters

Every render creates new functions and objects. `{}` !== `{}`. If you pass them to a `React.memo` child or put them in a `useEffect` dependency array, the child re-renders or the effect re-runs every time. Memoising keeps the same reference while deps are unchanged.

### When not to use them

Memoisation has a cost (storing values, comparing deps). Do not wrap everything. Use them when:

- A calculation is measurably slow (profile first).
- A value is passed to a memoised child.
- A value is a dependency of another hook.

### React Compiler

The React Compiler (stable since late 2025) automatically memoises components and values at build time, so in compiler-enabled projects you rarely need to write these hooks manually.

## Example

```jsx
import { memo, useCallback, useMemo, useState } from "react";

const ProductList = memo(function ProductList({ products, onSelect }) {
  console.log("ProductList rendered");
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id} onClick={() => onSelect(p.id)}>{p.name}</li>
      ))}
    </ul>
  );
});

export default function Shop({ allProducts }) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("light");

  // cache the filtered array (value)
  const visible = useMemo(
    () => allProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [allProducts, query]
  );

  // cache the handler (function)
  const handleSelect = useCallback((id) => console.log("selected", id), []);

  return (
    <div className={theme}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>Theme</button>
      {/* toggling theme does not re-render ProductList */}
      <ProductList products={visible} onSelect={handleSelect} />
    </div>
  );
}
```

## Common mistakes

- Using `useCallback` without a memoised consumer; the child re-renders anyway, so it adds cost for nothing.
- Missing dependencies, which captures stale values. Follow `eslint-plugin-react-hooks`.
- Relying on `useMemo` for correctness (e.g. to run something once). React may discard the cache.
- Memoising cheap computations like `a + b`.

## Follow-up questions

- **How is `React.memo` different?** `React.memo` memoises a whole component's render output based on props; the hooks memoise values inside a component.
- **Can `useMemo` replace `useEffect` for derived data?** Yes, derived data should be computed during render (optionally with `useMemo`), not synced via an effect and state.
- **Does the compiler make these hooks obsolete?** Mostly for new code; they remain valid and useful as escape hatches.

## Quick recap

- `useMemo` caches a value; `useCallback` caches a function.
- `useCallback(fn, d)` equals `useMemo(() => fn, d)`.
- Use them for expensive work and reference stability.
- Profile first; the React Compiler can do this for you.
