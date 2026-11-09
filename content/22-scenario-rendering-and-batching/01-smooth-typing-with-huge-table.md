---
title: "A user types in a search box while a huge table is rendering. How can React keep typing smooth?"
tags: ["scenario", "useDeferredValue", "useTransition", "performance", "virtualization"]
difficulty: "medium"
---

## Short answer

Split the update into an urgent part and a non-urgent part. Keep the input's own state urgent so each keystroke paints immediately, and feed the table a deferred version of the query with `useDeferredValue` (or update it inside `startTransition`). Memoize the table so it only re-renders when the deferred value changes, and virtualize the rows so React renders only what is visible.

## Why it happens

- The input value and the table filter share one state update, so every keystroke waits for the whole table to re-render.
- A normal (urgent) render is synchronous: React does not stop until all 10,000 rows are rendered, blocking the main thread, so the browser cannot paint the typed character.
- Filtering on each render and rendering thousands of DOM rows multiply the cost.

```text
 Before:  keypress -> setQuery -> render input + 10k rows (300 ms, blocked) -> paint
 After:   keypress -> setQuery -> render input (urgent) -> paint (fast)
                                   '-> background render of table with deferred query
                                       (interruptible; discarded if a new key arrives)
```

## How to fix it

1. Keep `query` in state for the input (urgent).
2. Derive `deferredQuery = useDeferredValue(query)` for the table.
3. Wrap the table in `memo` so the urgent render skips it (props unchanged).
4. Memoize the filtering with `useMemo`.
5. Virtualize rows (TanStack Virtual, react-window) when the list is very large.
6. Show staleness with `query !== deferredQuery` instead of a spinner.

```jsx
import { memo, useDeferredValue, useMemo, useState } from "react";

export function SearchableTable({ rows }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        <BigTable rows={rows} query={deferredQuery} />
      </div>
    </>
  );
}

const BigTable = memo(function BigTable({ rows, query }) {
  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );
  return (
    <table>
      <tbody>
        {filtered.map((r) => (
          <tr key={r.id}><td>{r.name}</td><td>{r.email}</td></tr>
        ))}
      </tbody>
    </table>
  );
});
```

The `useTransition` alternative works when you own the setter for the table state:

```jsx
const [isPending, startTransition] = useTransition();
function onChange(e) {
  setQuery(e.target.value);                                  // urgent
  startTransition(() => setTableQuery(e.target.value));      // can be interrupted
}
```

> **⚠️ Gotcha:** `useDeferredValue` only helps if the slow component is memoized. Without `memo`, the urgent render still re-renders the table with the same props.

## How to verify

- React DevTools Profiler: the urgent commit should not include `BigTable`; the table renders in a separate, later commit.
- Chrome Performance panel with 4x CPU throttling: no long tasks between keypress and paint of the character.
- Measure INP (Web Vitals extension or `web-vitals` library); it should drop clearly.
- Type fast: intermediate table renders should be skipped, not queued.

## Follow-up questions

- **Why not debounce?** Debouncing delays every update by a fixed time even on fast devices; deferred rendering adapts to the device and is interruptible. For network requests, debouncing is still useful.
- **Does this make the table render faster?** No. It makes the input stay responsive; virtualization and memoization make the table itself cheaper.
- **When is concurrency not enough?** If the cost is outside React (a single heavy synchronous computation), move it to a Web Worker or precompute it.

## Quick recap

- Separate urgent (input) from non-urgent (table) updates.
- `useDeferredValue` or `startTransition` makes the table render interruptible.
- `memo` + `useMemo` so urgent renders skip the table.
- Virtualize huge lists; verify with Profiler and INP.
