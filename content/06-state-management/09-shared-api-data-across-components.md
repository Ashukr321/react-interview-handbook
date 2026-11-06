---
title: "Product list is used in Navbar, Sidebar, and Product page. How will you manage it?"
asked_as: ["Multiple components need the same API data. How will you manage it?"]
tags: ["server-state", "rtk-query", "tanstack-query", "caching", "scenario"]
difficulty: "medium"
---

## Short answer

Treat the product list as **server state** and put it behind a shared cache, using RTK Query or TanStack Query. Each component calls the same hook (`useGetProductsQuery()`), the library sends **one** request, caches the result under one key and gives all three components the same data, loading and error state. Mutations invalidate that cache so every consumer updates together.

## Why it happens

The naive approach is `useEffect(() => fetch("/api/products"))` inside Navbar, Sidebar and ProductPage:

```text
Navbar      -> GET /api/products
Sidebar     -> GET /api/products     3 identical requests
ProductPage -> GET /api/products     3 copies of data, can drift apart
```

- Duplicate network calls on every mount.
- Three separate copies; an edit on the product page does not update the navbar count.
- Each component reimplements loading, error, retry and race-condition handling.

Lifting the fetch to `App` and passing props fixes duplication but causes prop drilling and fetches data even on pages that do not need it.

## How to fix it

1. **Define the endpoint once** in a server-state library.
2. **Call the hook wherever needed.** Requests with the same cache key are deduplicated.
3. **Use `select` / `selectFromResult`** so the Navbar subscribes only to the count, not the full list.
4. **Invalidate on mutation** with tags (RTK Query) or `queryClient.invalidateQueries` (TanStack Query).
5. **Tune freshness** with `staleTime` / `keepUnusedDataFor` and refetch on focus/reconnect.
6. **Prefetch** in a route loader or on hover for instant navigation.

```jsx
// services/api.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Product"],
  endpoints: (build) => ({
    getProducts: build.query({
      query: () => "products",
      providesTags: ["Product"],
    }),
    addProduct: build.mutation({
      query: (body) => ({ url: "products", method: "POST", body }),
      invalidatesTags: ["Product"], // all three components refetch once
    }),
  }),
});
export const { useGetProductsQuery, useAddProductMutation } = api;
```

```jsx
// Navbar.jsx - only re-renders when the count changes
export function Navbar() {
  const { count } = useGetProductsQuery(undefined, {
    selectFromResult: ({ data }) => ({ count: data?.length ?? 0 }),
  });
  return <nav>Products ({count})</nav>;
}

// Sidebar.jsx
export function Sidebar() {
  const { data = [] } = useGetProductsQuery();
  const categories = [...new Set(data.map((p) => p.category))];
  return <aside>{categories.map((c) => <a key={c} href={`?category=${c}`}>{c}</a>)}</aside>;
}

// ProductPage.jsx
export function ProductPage() {
  const { data = [], isLoading, error } = useGetProductsQuery();
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Could not load products</p>;
  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

In the Next.js App Router, an alternative is fetching in a server component; identical `fetch` calls in one request are deduplicated and can be cached.

> **💡 Interview tip:** Say "this is server state, not global state" early. Interviewers are often checking whether you know not to hand-roll it in a Redux slice or Context.

## How to verify

- Network tab: one `GET /api/products` even though three components mount.
- Add a product: one refetch, and the navbar count, sidebar and page all update.
- Redux DevTools / TanStack Query DevTools show one cache entry with three subscribers.

## Follow-up questions

- **Why not just put it in Context?** Context shares the data but gives you no caching, deduping, invalidation, background refetch or retry; you would rebuild a query library.
- **What if data is huge?** Paginate or use infinite queries, and give the navbar a dedicated `/products/count` endpoint.
- **How do you do optimistic updates?** Use `onQueryStarted` with `updateQueryData` in RTK Query, or `onMutate` with rollback in TanStack Query.

## Quick recap

- Shared API data is server state; use a query cache.
- Same hook everywhere means one request and one source of truth.
- Select only what each component needs.
- Mutations invalidate tags so every consumer refreshes together.
