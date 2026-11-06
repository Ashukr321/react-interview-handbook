---
title: "What are Different Types of State in React?"
tags: ["state", "server-state", "url-state", "architecture"]
difficulty: "easy"
---

## Short answer

State in a React app falls into a few categories: **local UI state** (owned by one component), **shared/lifted state** (owned by a common parent), **global client state** (auth, theme, cart), **server state** (cached API data), **URL state** (route params, search params) and **form state**. Each has a natural home and a best-fit tool, and most bugs come from putting state in the wrong category.

## Explanation

Classifying state is the first step to choosing a tool. A useful analogy is a house: your pocket (local), the family fridge (shared), the house address everyone knows (global), the supermarket you shop from (server) and the street sign outside (URL).

| Type | Example | Typical tool |
|---|---|---|
| Local UI state | Modal open, input text, active tab | `useState`, `useReducer` |
| Shared (lifted) state | Filter used by a list and its toolbar | Lift to common parent, pass props |
| Global client state | Logged-in user, theme, cart, feature flags | Context, Redux Toolkit, Zustand |
| Server state | Products, orders, user profile from API | RTK Query, TanStack Query, SWR, Next.js server components |
| URL state | Page number, search query, selected id | React Router `useSearchParams`, Next.js `searchParams` |
| Form state | Field values, errors, touched, dirty | React Hook Form, Formik, React 19 form actions |
| Derived state | Filtered list, totals, `isValid` | Compute in render, `useMemo`, selectors |
| Persistent state | Remembered preferences, drafts | `localStorage`, IndexedDB, cookies |

### Why server state is different

Server state is not really yours. It is a cached copy of data that lives on a server and can go stale. It needs caching, deduplication, refetching, invalidation and loading/error handling. Writing all of that by hand in Redux or `useEffect` is the classic mistake; libraries like RTK Query and TanStack Query exist exactly for this.

### Why URL state matters

If the user should be able to refresh, bookmark or share a view (filters, pagination, selected tab), the URL is the source of truth. Copying it into `useState` creates two sources that drift apart.

### Derived state is not state

If a value can be calculated from other state or props, compute it. Storing it creates sync bugs.

## Example

```jsx
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export function ProductPage() {
  const [isFilterOpen, setFilterOpen] = useState(false);       // local UI
  const [searchParams, setSearchParams] = useSearchParams();   // URL state
  const category = searchParams.get("category") ?? "all";

  const { data: products = [], isLoading } = useQuery({         // server state
    queryKey: ["products"],
    queryFn: () => fetch("/api/products").then((r) => r.json()),
  });

  const visible = useMemo(                                     // derived
    () => products.filter((p) => category === "all" || p.category === category),
    [products, category]
  );

  if (isLoading) return <p>Loading...</p>;
  return (
    <>
      <button onClick={() => setFilterOpen((o) => !o)}>Filters</button>
      {isFilterOpen && (
        <select value={category} onChange={(e) => setSearchParams({ category: e.target.value })}>
          <option value="all">All</option>
          <option value="shoes">Shoes</option>
        </select>
      )}
      <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  );
}
```

## Common mistakes

- Putting API responses in Redux slices with hand-written loading flags instead of using a server-state cache.
- Duplicating URL params into `useState` and getting out of sync on back/forward navigation.
- Making everything global "just in case", which causes needless re-renders and coupling.
- Storing derived values in state.

## Follow-up questions

- **How is server state different from client state?** Server state is owned remotely, can be stale and is shared with other users; client state is owned by the browser session and always current.
- **Where would you keep a selected tab?** Local state if it is cosmetic; URL state if users should be able to link to it.
- **Is Context a state manager?** No, it is a dependency-injection mechanism; the state still lives in `useState`/`useReducer` above the provider.

## Quick recap

- Classify state first: local, shared, global, server, URL, form, derived.
- Server state needs a cache library, not a hand-rolled store.
- URL is the source of truth for shareable views.
- Derived values should be computed, not stored.
