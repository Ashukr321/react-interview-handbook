---
title: "An API response updates five different states. How can React optimize this?"
tags: ["scenario", "batching", "useReducer", "state-design", "data-fetching"]
difficulty: "medium"
---

## Short answer

In React 18+, five `setState` calls after an `await` are automatically batched into one render, so React already optimizes the common case. The bigger wins come from state design: put values that change together into one `useReducer` or object state, derive values instead of storing them, avoid chains of effects that set state in response to other state, and consider a data library like TanStack Query that owns `data`, `isLoading` and `error` for you.

## Why it happens

The problem usually is not the five setters; it is what surrounds them:

- **React 17 or legacy root**: updates after `await` were not batched, so five setters meant five renders.
- **Effect chains**: `useEffect` watches `data` and sets `total`, another watches `total` and sets `status`, each causing an extra render pass.
- **Redundant state**: `filteredItems`, `count` and `isEmpty` are stored even though they can be computed from `items`.
- **Inconsistent intermediate states**: separate setters spread across code can leave `loading=false` with `data=null` if one branch is missed.

```text
 Effect chain (bad):  fetch -> setData -> render -> effect -> setTotal -> render -> effect -> setStatus -> render
 Reducer (good):      fetch -> dispatch(success) -> 1 render with consistent state
```

## How to fix it

1. Confirm the app uses `createRoot` (automatic batching).
2. Collapse related state into a reducer with explicit transitions.
3. Compute derived values during render (`useMemo` only if expensive).
4. Remove effects that only sync state to other state.
5. Cancel stale requests with `AbortController`.

```jsx
import { useEffect, useMemo, useReducer } from "react";

const initial = { status: "idle", items: [], user: null, error: null, page: 1 };

function reducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...state, status: "loading", error: null };
    case "success":
      return { ...state, status: "success", items: action.items, user: action.user, page: action.page };
    case "error":
      return { ...state, status: "error", error: action.error };
    default:
      return state;
  }
}

export function Orders({ page }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: "start" });
    fetch(`/api/orders?page=${page}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => dispatch({ type: "success", items: data.items, user: data.user, page }))
      .catch((error) => {
        if (error.name !== "AbortError") dispatch({ type: "error", error });
      });
    return () => controller.abort();
  }, [page]);

  // Derived, not stored
  const total = useMemo(() => state.items.reduce((sum, o) => sum + o.amount, 0), [state.items]);

  if (state.status === "loading") return <p>Loading...</p>;
  if (state.status === "error") return <p role="alert">Could not load orders.</p>;
  return <p>{state.items.length} orders, total {total}</p>;
}
```

With TanStack Query the whole reducer disappears:

```jsx
const { data, isPending, error } = useQuery({
  queryKey: ["orders", page],
  queryFn: ({ signal }) => fetch(`/api/orders?page=${page}`, { signal }).then((r) => r.json()),
});
```

## How to verify

- `console.log` in render or React DevTools Profiler: one commit after the response arrives.
- Enable "Highlight updates when components render" in React DevTools to spot extra passes from effect chains.
- Check for impossible states (spinner and error at once) in tests for each reducer action.

## Follow-up questions

- **Does `useReducer` render less than five `useState` calls?** Not by itself when batched; it improves consistency and readability, and removes the chance of partial updates.
- **What if five different components own the five states?** Batching still applies across components; one render pass covers all of them.
- **When would you use `flushSync` here?** Almost never; only if you must read the updated DOM synchronously.

## Quick recap

- React 18+ batches the five updates into one render.
- Real gains: reducer for related state, derive instead of store.
- Remove effect chains that set state from state.
- A data-fetching library manages loading/data/error for you.
