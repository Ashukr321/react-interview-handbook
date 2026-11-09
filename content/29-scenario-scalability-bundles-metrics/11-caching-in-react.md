---
title: "How do you handle caching in React?"
tags: ["caching", "react-query", "memoization", "http-cache"]
difficulty: "medium"
---

## Short answer

Caching in a React app happens at several layers: **render-level** memoization (`useMemo`, `React.memo`), **server-state** caching with TanStack Query, SWR or RTK Query (dedupe requests, serve cached data, refetch in the background), **browser/HTTP** caching (`Cache-Control`, CDN, service workers), and **framework** caching such as Next.js fetch and route caches. The hard part is invalidation: deciding how long data stays fresh and refreshing it after mutations.

## Explanation

A cache is like keeping frequently used tools on your desk instead of walking to the store room each time. The risk is using an old tool after it was replaced, so you also need rules for when to go back.

### Caching layers

| Layer | Tool | Caches |
| --- | --- | --- |
| Render | `useMemo`, `React.memo`, React Compiler | Computed values, component output |
| Server state | TanStack Query, SWR, RTK Query, Apollo | API responses keyed by query |
| Server (RSC) | Next.js `fetch` cache, `"use cache"`, `React.cache` | Data per request or across requests |
| HTTP / CDN | `Cache-Control`, ETag, CDN edge | Assets, HTML, API responses |
| Offline | Service worker (Workbox), Cache Storage | App shell, assets, API fallbacks |
| Persistent | `localStorage`, IndexedDB | User preferences, drafts, offline data |

### Server-state caching

Libraries like TanStack Query store responses by key and provide:

- **Deduplication**: ten components asking for `["user", 1]` make one request.
- **`staleTime`**: how long data counts as fresh (no refetch).
- **`gcTime`**: how long unused data stays in memory.
- **Stale-while-revalidate**: show cached data instantly, refresh in the background.
- **Invalidation**: mark keys stale after a mutation so they refetch.

### HTTP caching

```text
Hashed assets:   Cache-Control: public, max-age=31536000, immutable
HTML:            Cache-Control: no-cache   (revalidate with ETag)
API (public):    Cache-Control: public, s-maxage=60, stale-while-revalidate=300
API (private):   Cache-Control: private, no-store   (user-specific data)
```

## Example

```jsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 30_000,      // fresh for 30s: no refetch on remount
    gcTime: 5 * 60_000,     // keep unused cache for 5 min
  });
}

function AddTodo() {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (title) =>
      fetch("/api/todos", { method: "POST", body: JSON.stringify({ title }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });
  return <button onClick={() => mutate("New task")}>Add</button>;
}

function TodoList() {
  const { data = [], isFetching } = useTodos();
  return (
    <ul aria-busy={isFetching}>
      {data.map((t) => <li key={t.id}>{t.title}</li>)}
    </ul>
  );
}
```

> **⚠️ Gotcha:** Never cache private, user-specific responses on a shared CDN (`public`). Also clear the client cache on logout (`queryClient.clear()`) so the next user does not see old data.

## Common mistakes

- Copying server data into Redux or `useState` and hand-writing loading, caching and refetch logic.
- `staleTime: 0` everywhere (the default), causing refetches on every mount and window focus.
- Forgetting to invalidate after mutations, so the UI shows stale data.
- Using `useMemo` as a data cache; React may throw it away, and it is per component instance.

## Follow-up questions

- **`staleTime` vs `gcTime`?** `staleTime` controls when data needs a refetch; `gcTime` controls when unused data is removed from memory.
- **What is cache busting?** Putting a content hash in filenames so new deploys get new URLs while old files stay cached forever.
- **What does `React.cache` do?** In Server Components, it deduplicates a function call within one server request.

## Quick recap

- Cache at render, server-state, framework, HTTP/CDN and offline layers.
- Use TanStack Query/SWR/RTK Query for API data instead of hand-written caches.
- Tune `staleTime`, invalidate after mutations.
- Long-cache hashed assets; never share private data via public caches.
