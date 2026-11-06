---
title: "How can you do caching on a website?"
tags: ["caching", "performance", "http", "service-worker"]
difficulty: "medium"
---

## Short answer

Caching happens in layers: the browser HTTP cache (controlled by `Cache-Control` and ETag headers), a service worker cache for offline and custom strategies, a CDN at the edge, server-side caches like Redis, and in-app data caches such as TanStack Query or RTK Query. The classic rule for SPAs is: hashed static assets get a one-year `immutable` cache, HTML is always revalidated, and API data uses short or stale-while-revalidate caching with clear invalidation.

## Explanation

Caching is like keeping groceries at different distances: the fridge (memory), the pantry (disk), the corner shop (CDN), and the supermarket (origin server). The closer the copy, the faster, but the more likely it is out of date.

```text
 React app ---> In-memory data cache (TanStack Query / RTK Query)
     |
     v
 Browser ---> Memory cache -> HTTP disk cache -> Service Worker (Cache API)
     |
     v
 CDN / Edge cache  (Cloudflare, CloudFront, Vercel)
     |
     v
 Origin server ---> App cache (Redis) ---> Database
```

### Strategy per resource

| Resource | Strategy | Header / tool |
|---|---|---|
| `main.4f2a9c.js`, CSS, fonts | Cache forever, new deploy = new file name | `Cache-Control: public, max-age=31536000, immutable` |
| `index.html` | Always check for a new version | `Cache-Control: no-cache` + ETag |
| Public API data | Short cache, serve stale while refreshing | `max-age=60, stale-while-revalidate=300` |
| Private user data | Never store in shared caches | `Cache-Control: private` or `no-store` for sensitive data |
| Offline shell | Cache-first in service worker | Workbox |
| Server data in React | Dedupe, cache, background refetch | TanStack Query `staleTime`, `gcTime` |

### Service worker strategies

- **Cache first**: static assets, fonts.
- **Network first**: HTML and API calls where freshness matters.
- **Stale-while-revalidate**: avatars, product lists; show cached instantly, update in background.

### Invalidation

The hard part. Use content hashes for assets, purge CDN paths on deploy, use tags or keys in server caches, and call `queryClient.invalidateQueries` after mutations.

## Example

```js
// Express: static assets vs HTML
app.use("/assets", express.static("dist/assets", { immutable: true, maxAge: "1y" }));
app.get("*", (req, res) => {
  res.set("Cache-Control", "no-cache"); // revalidate the HTML shell every time
  res.sendFile(path.resolve("dist/index.html"));
});
```

```jsx
// Client data cache with TanStack Query
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function Products() {
  const { data = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch("/api/products").then((r) => r.json()),
    staleTime: 60_000, // fresh for 1 minute: no refetch on remount
  });
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (p) => fetch("/api/products", { method: "POST", body: JSON.stringify(p) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

## Common mistakes

- Caching `index.html` for a long time, so users keep loading old bundles that no longer exist (white screen after deploy).
- Using `public` on responses with user data, letting a CDN serve one user's data to another.
- Thinking `no-cache` means "do not cache"; it means "revalidate before use". `no-store` means do not store.
- Forgetting invalidation after mutations, showing stale lists.

## Follow-up questions

- **How do you force users onto a new version?** Hashed asset names plus `no-cache` HTML; for service workers, prompt to reload when a new worker is waiting.
- **What is stale-while-revalidate?** Serve the cached copy immediately while fetching a fresh one in the background for next time.
- **What does Next.js add?** Its own caching layers for fetches, rendered routes and the client router, controlled with `revalidate`, `revalidatePath` and `revalidateTag`.

## Quick recap

- Cache in layers: app memory, browser, service worker, CDN, server.
- Hashed assets: one year + `immutable`; HTML: `no-cache`.
- Use stale-while-revalidate for data that can be slightly old.
- Never cache private data in shared caches.
- Plan invalidation as carefully as caching.
