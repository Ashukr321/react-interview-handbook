---
title: "A component is fetching the same data multiple times unnecessarily. How do you fix it?"
tags: ["useeffect", "data-fetching", "performance", "react-query"]
difficulty: "medium"
---

## Short answer

First find **why** the effect re-runs: StrictMode double-invoking effects in development (expected), unstable dependencies (objects or functions recreated each render), the component remounting, or several components fetching the same data independently. Fix the root cause: correct and stable dependencies, a cleanup that aborts stale requests, and a shared cache that dedupes requests (TanStack Query, SWR, RTK Query, or framework loaders).

## Why it happens

| Cause | Symptom |
|---|---|
| React StrictMode (dev only) | Exactly two requests on mount, none in production |
| Object/array/function in deps created during render | Request on every render, sometimes an infinite loop |
| Effect sets state that's also a dependency | Fetch loop |
| Component remounts (changing `key`, conditional rendering, parent remount) | Request on every toggle/navigation |
| Many components call the same fetch | N identical requests on one page |
| No caching | Refetch every time the user returns to the page |

```jsx
// Buggy: "filters" is a new object every render of the parent
function Products({ category }) {
  const filters = { category, inStock: true };
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`/api/products?${new URLSearchParams(filters)}`)
      .then((r) => r.json())
      .then(setItems); // setItems -> re-render -> new filters -> effect again
  }, [filters]);
}
```

## How to fix it

1. **Check whether it's StrictMode.** If it only happens in development, keep StrictMode; it's surfacing missing cleanup. Make the effect safe to run twice.
2. **Depend on primitives**, or memoize objects/functions with `useMemo` / `useCallback`, or move them inside the effect.
3. **Add cleanup** with `AbortController` so stale requests are cancelled.
4. **Stop remounts**: avoid changing `key`s and conditional wrappers that unmount the fetching component.
5. **Use a cache that dedupes**: TanStack Query shares one request among all components using the same `queryKey` and caches results with `staleTime`.

```jsx
// Fixed with effect: primitive deps + abort cleanup
function Products({ category }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams({ category, inStock: "true" });
    fetch(`/api/products?${qs}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setItems)
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e); // aborts are expected
      });
    return () => controller.abort();
  }, [category]);
}
```

```jsx
// Better: shared, deduped, cached
import { useQuery } from "@tanstack/react-query";

function useProducts(category) {
  return useQuery({
    queryKey: ["products", category],
    queryFn: ({ signal }) =>
      fetch(`/api/products?category=${category}`, { signal }).then((r) => r.json()),
    staleTime: 60_000, // don't refetch within a minute
  });
}
```

## How to verify

- Network tab: filter by the endpoint and count requests on mount, re-render and navigation.
- Build and run production mode to rule out StrictMode double effects.
- React DevTools "Highlight updates" and the Profiler show unexpected re-renders and remounts.
- ESLint `react-hooks/exhaustive-deps` flags unstable or missing dependencies.
- TanStack Query Devtools show cache hits vs fetches.

## Follow-up questions

- **Should you disable StrictMode to fix it?** No. Production runs effects once; StrictMode reveals effects that aren't resilient.
- **Is `useRef(false)` "has fetched" flag a good fix?** It hides the symptom and breaks with remounts and future features; use cleanup or a cache.
- **How do Server Components help?** Data is fetched on the server, and React's `cache()` dedupes calls within a request.

## Quick recap

- Find the cause: StrictMode, deps, remounts, or many callers.
- Use primitive or memoized dependencies.
- Abort stale requests in cleanup.
- Use a deduping cache for shared data.
- Verify in the Network tab in production mode.
