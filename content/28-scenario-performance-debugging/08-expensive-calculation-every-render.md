---
title: "A component performs expensive calculations on every render. How would you optimize it?"
tags: ["useMemo", "web-workers", "performance", "memoization"]
difficulty: "medium"
---

## Short answer

I first measure that the calculation is actually expensive (more than about 1 ms with `console.time` or the Profiler). Then I cache it with `useMemo` so it only reruns when its inputs change, and if it is still slow when inputs do change, I reduce the work (better algorithm, pre-indexing, server-side computation), defer it with `useDeferredValue`, or move it to a Web Worker.

## Why it happens

Everything in a component body runs on every render. If you sort, filter, aggregate or parse large data there, that cost is paid even when the render was triggered by something unrelated, like a hover state or a parent update.

```jsx
function Report({ transactions, theme }) {
  // runs again when only `theme` changes
  const summary = buildSummary(transactions); // 200 ms
  return <Table data={summary} theme={theme} />;
}
```

## How to fix it

### 1. Measure

```js
console.time("buildSummary");
const summary = buildSummary(transactions);
console.timeEnd("buildSummary");
```

Use CPU throttling; your users' devices are slower than yours.

### 2. Memoize with `useMemo`

```jsx
function Report({ transactions, theme }) {
  const summary = useMemo(() => buildSummary(transactions), [transactions]);
  return <Table data={summary} theme={theme} />;
}
```

Make sure `transactions` itself is a stable reference (from state, a query cache or a memoized value), otherwise `useMemo` recalculates every time.

### 3. Make the work cheaper

- Replace nested loops with a `Map` lookup (O(n^2) -> O(n)).
- Precompute indexes once when data loads, not per render.
- Ask the API for pre-aggregated data or paginate.

### 4. Keep the UI responsive when it must rerun

```jsx
function Search({ items }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => expensiveFilter(items, deferredQuery), [items, deferredQuery]);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results data={results} stale={query !== deferredQuery} />
    </>
  );
}
```

### 5. Move it off the main thread

For CPU-heavy work (parsing CSV, statistics, image processing), run it in a Web Worker (Comlink makes the API feel like a normal async function) and store the result in state.

| Situation | Tool |
| --- | --- |
| Recomputes on unrelated renders | `useMemo` |
| Slow even when inputs change | Better algorithm / server |
| Blocks typing | `useDeferredValue` / `useTransition` |
| Seconds of CPU work | Web Worker |

> **⚠️ Gotcha:** `useMemo` is a performance hint, not a guarantee; React may discard cached values. Never rely on it for correctness, and do not wrap cheap expressions, since memoization has its own cost.

## How to verify

- `console.time` / Profiler shows the calculation no longer runs on unrelated updates.
- Commit duration for interactions drops; no long tasks while typing.
- Profile with throttling on a production build.

## Follow-up questions

- **`useMemo` vs `React.memo`?** `useMemo` caches a value inside a component; `React.memo` skips re-rendering a whole component when props are equal.
- **Does the React Compiler replace `useMemo`?** It memoizes automatically in most cases, but slow algorithms and huge workloads still need real fixes.
- **Why not `useEffect` + `useState` for derived data?** It adds an extra render and can show stale values; compute during render instead.

## Quick recap

- Measure first; memoize only expensive work.
- `useMemo` with stable dependencies stops recalculation on unrelated renders.
- Cheaper algorithms or server-side aggregation beat caching.
- Defer or offload to a Worker when the work must happen.
