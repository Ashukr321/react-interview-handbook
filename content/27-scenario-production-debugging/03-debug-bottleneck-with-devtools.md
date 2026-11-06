---
title: "How would you debug a performance bottleneck in a React app using DevTools?"
tags: ["devtools", "profiler", "performance", "debugging"]
difficulty: "medium"
---

## Short answer

I reproduce the slow interaction, record it in the React DevTools Profiler to see which components rendered, why, and how long they took, and record it in the Chrome Performance panel to see long tasks, layout and paint. Once I know whether the cost is React rendering, my own JavaScript, network, or the browser's layout work, I apply the matching fix and record again to compare.

## Why it happens

Bottlenecks usually fall into one of four buckets:

| Bucket | Symptom in DevTools |
| --- | --- |
| Too many re-renders | Profiler shows many components re-rendering for a small change |
| Expensive render | One component has a long bar in the flamegraph |
| Heavy JS / long tasks | Red-cornered tasks over 50 ms in the Performance panel |
| Layout / paint | Purple (layout) and green (paint) blocks, "Forced reflow" warnings |

## How to fix it

### 1. React DevTools Profiler

- Settings: enable **"Record why each component rendered"** and **"Highlight updates"**.
- Click record, do the slow interaction, stop.
- Read the **flamegraph** (who rendered, how long) and **ranked** view (slowest first).
- Hover a component: "Why did this render?" shows props, state, hooks or parent changes.

### 2. Chrome Performance panel

```text
Record -> do interaction -> Stop
  Main thread track:
    Task (long, red corner) -> expand
      -> Function call  -> your code / react-dom
      -> Recalculate Style / Layout -> CSS or forced reflow
  Bottom-Up tab: which functions take most self time
```

Use CPU throttling (4x/6x) to simulate an average phone.

### 3. Apply the matching fix

```jsx
// Profiler said: ProductList re-renders when the header's search text changes
const ProductList = memo(function ProductList({ items, onSelect }) {
  return items.map((p) => <Row key={p.id} item={p} onSelect={onSelect} />);
});

function Page() {
  const [query, setQuery] = useState("");
  const [items] = useProducts();
  const onSelect = useCallback((id) => navigate(`/p/${id}`), []);
  const deferredQuery = useDeferredValue(query);
  const visible = useMemo(() => filter(items, deferredQuery), [items, deferredQuery]);
  return (
    <>
      <SearchBox value={query} onChange={setQuery} />
      <ProductList items={visible} onSelect={onSelect} />
    </>
  );
}
```

Other fixes by bucket: move state down, virtualize long lists, split heavy work into a Web Worker, avoid reading layout (`offsetHeight`) right after writing styles.

> **💡 Interview tip:** If the project uses the React Compiler, much of the manual `memo`/`useCallback` work is automatic, so the Profiler is used to find what is still slow, such as large lists or heavy computations.

## How to verify

- Record the same interaction again: fewer components rendered, shorter commits.
- No long tasks over 50 ms for the interaction; INP improves in the field.
- Always profile a production build (`react-dom/profiling` if needed), not dev mode.

## Follow-up questions

- **Why not profile in development mode?** Dev builds include extra checks and StrictMode double renders, so timings are misleading.
- **What is the `<Profiler>` component?** A React API with an `onRender` callback that reports render durations programmatically, useful for logging in production.
- **What is a long task?** Any main-thread task over 50 ms; it blocks input handling.

## Quick recap

- Reproduce, then record in both React Profiler and Chrome Performance.
- Classify: re-renders, expensive render, heavy JS, or layout/paint.
- Fix the specific cause, not everything at once.
- Re-record on a production build to confirm.
