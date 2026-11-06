---
title: "A search input filters 50,000 records. How would you keep typing responsive?"
tags: ["usedeferredvalue", "concurrent", "performance", "virtualization", "search"]
difficulty: "medium"
---

## Short answer

Keep the input's own state **urgent** and render the expensive results from a **deferred** copy of the query with `useDeferredValue`, inside a `memo`-ized list. Typing then updates immediately, and the 50,000-record filter re-renders in the background, where it's interruptible and abandoned if the user keeps typing. Combine that with reducing the work: memoize the filter, virtualize the results, and for very heavy matching use a search index or Web Worker.

## Why it happens

A controlled input re-renders on every keystroke. If the same render also filters 50,000 records and renders thousands of rows, each keystroke becomes a 100–300 ms long task, and characters appear late or get "stuck".

```text
Keystroke ─► setQuery ─► filter 50k + render 3k rows ─► paint     (blocked ~200ms)

With useDeferredValue:
Keystroke ─► render input with new query ─► paint (fast)
          └► background render with deferredQuery (interruptible)
                 next keystroke? → abandon, start again with latest
```

## How to fix it

1. Keep `query` for the input.
2. Derive `deferredQuery = useDeferredValue(query)`.
3. Pass `deferredQuery` to a `memo` component, so the urgent render skips it.
4. `useMemo` the filtering inside it.
5. Virtualize the output (`react-window`, TanStack Virtual).

```jsx
import { memo, useDeferredValue, useMemo, useState } from "react";

const Results = memo(function Results({ records, query }) {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? records.filter((r) => r.searchText.includes(q)) : records;
  }, [records, query]);

  return (
    <ul>
      {matches.slice(0, 200).map((r) => ( // or a virtualized list
        <li key={r.id}>{r.name}</li>
      ))}
    </ul>
  );
});

export default function Search({ records }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search 50,000 records"
      />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        <Results records={records} query={deferredQuery} />
      </div>
    </>
  );
}
```

Pre-computing `searchText` (lowercased name and fields) once when the data loads avoids lowercasing 50k strings per keystroke.

> **⚠️ Gotcha:** Without `memo` on `Results`, the urgent render re-renders it with the *old* deferred query anyway, and you lose most of the benefit (unless the React Compiler memoizes it for you).

> **💡 Interview tip:** If the filter itself takes ~200 ms in a single synchronous call, deferring can't split it. Move it to a Web Worker or use an indexed search (e.g. a prefix trie or a library like FlexSearch).

## How to verify

- Type quickly with 6x CPU throttling: characters should appear without lag.
- Chrome Performance panel: keystroke tasks stay short; the background renders are interrupted.
- Profiler: the urgent commit renders the input only, and `Results` commits separately.

## Follow-up questions

- **`useDeferredValue` or `startTransition` here?** `useDeferredValue` when you only receive the value (e.g. as a prop); `startTransition` when you own the setter and can split urgent and non-urgent state.
- **Is debouncing still useful?** Yes, for network search, to reduce API calls.
- **What if results come from the server?** Combine a deferred value with Suspense-enabled fetching, so the old results stay visible while the new ones load.

## Quick recap

- Input state stays urgent; results read a deferred value.
- `memo` the expensive child, or it re-renders anyway.
- Memoize, precompute and virtualize to reduce the work.
- Workers or indexes for truly heavy filtering.
