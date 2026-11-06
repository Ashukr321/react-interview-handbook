---
title: "A search input becomes sluggish when filtering a large dataset. How would you fix it?"
tags: ["search", "debounce", "useDeferredValue", "virtualization"]
difficulty: "medium"
---

## Short answer

Typing lags because each keystroke synchronously filters thousands of items and re-renders a huge list before the browser can paint the next character. I keep the input update urgent and make the filtering non-urgent with `useDeferredValue` (or debounce it), memoize the filter, render results with virtualization, and for really large data move filtering to a Web Worker or the server.

## Why it happens

```text
keystroke -> setQuery -> filter 50,000 items (80ms) -> render 5,000 rows (300ms)
          -> paint -> next keystroke has been waiting ~400ms
```

- Filtering runs on every keystroke in the render path.
- Every matching row is rendered to the DOM.
- The input shares one state update with the heavy list, so React cannot prioritize it.
- Filter function does extra work each time (`toLowerCase()` on every item, regex creation).

## How to fix it

### 1. Separate urgent and deferred updates

```jsx
function ProductSearch({ products }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return q ? products.filter((p) => p.searchKey.includes(q)) : products;
  }, [products, deferredQuery]);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <div style={{ opacity: query !== deferredQuery ? 0.6 : 1 }}>
        <ResultList items={results} />
      </div>
    </>
  );
}

const ResultList = memo(function ResultList({ items }) {
  return <VirtualList items={items} rowHeight={40} />; // e.g. TanStack Virtual
});
```

The input renders immediately; the list renders with the deferred value and React can interrupt it when the user types again. `ResultList` must be memoized so the urgent render skips it.

### 2. Precompute search keys

```js
const indexed = rawProducts.map((p) => ({
  ...p,
  searchKey: `${p.name} ${p.sku} ${p.brand}`.toLowerCase(),
}));
```

Do this once when data loads, not per keystroke. For fuzzy search, build a Fuse.js or FlexSearch index once.

### 3. Debounce when filtering is remote or very costly

```jsx
const [debounced, setDebounced] = useState(query);
useEffect(() => {
  const id = setTimeout(() => setDebounced(query), 250);
  return () => clearTimeout(id);
}, [query]);
```

For server search, also cancel stale requests (`AbortController`, or TanStack Query keyed by the term) to avoid out-of-order results.

### 4. Render less, compute elsewhere

- Virtualize results so only visible rows exist in the DOM.
- Move filtering of 100k+ items to a Web Worker, or do it in the database.

| Technique | Fixes |
| --- | --- |
| `useDeferredValue` | Input stays responsive |
| `useMemo` + precomputed keys | Cheaper filtering |
| Debounce | Fewer filter/API calls |
| Virtualization | Cheaper rendering |
| Worker / server | Huge datasets |

> **💡 Interview tip:** Explain the difference: debounce delays work by a fixed time; `useDeferredValue` starts immediately but lets urgent updates interrupt it, adapting to the device's speed.

## How to verify

- Type fast with 6x CPU throttling: characters appear instantly.
- Performance panel shows short input events and no long tasks per keystroke.
- INP for the search interaction under 200 ms.

## Follow-up questions

- **Debounce vs throttle?** Debounce waits until typing pauses; throttle runs at most once per interval.
- **Why memoize the result list component?** Otherwise the urgent re-render still renders the heavy list with the old value.
- **How do you avoid race conditions in remote search?** Abort previous requests or ignore responses that are not for the latest query.

## Quick recap

- Keep the input urgent; defer the list (`useDeferredValue`).
- Precompute search keys and memoize filtering.
- Debounce remote calls and cancel stale ones.
- Virtualize results; offload huge datasets.
