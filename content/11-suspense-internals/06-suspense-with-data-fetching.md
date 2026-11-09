---
title: "Can Suspense work with data fetching?"
tags: ["suspense", "data-fetching", "use", "react-query"]
difficulty: "medium"
---

## Short answer

Yes, but only with a **Suspense-enabled data source**. Suspense doesn't fetch anything; a component must suspend while its data is pending. In practice that means a framework (Next.js App Router with Server Components, React Router loaders with `Await`), a library (TanStack Query `useSuspenseQuery`, SWR, Relay, Apollo), or React 19's `use()` with a **cached** promise. Plain `useEffect` + `fetch` doesn't work with Suspense.

## Explanation

Analogy: Suspense is the waiting room. It only knows someone is waiting if they check in at the desk (suspend). If they wait silently in the hallway (`useEffect` loading state), the waiting room never knows.

### Three fetching patterns

| Pattern | When fetching starts | Suspense? |
|---|---|---|
| Fetch-on-render (`useEffect`) | After the component mounts | No; causes waterfalls |
| Fetch-then-render (await everything, then render) | Before render | No; whole page waits |
| Render-as-you-fetch | Starts early (loader, event, server), render reads it | Yes |

Render-as-you-fetch is what Suspense was designed for: start requests as early as possible, render immediately, suspend only where data is actually missing.

### Options today

- **Server Components**: `async function Page() { const data = await getData(); }` suspends to the nearest boundary (`loading.js` in Next.js).
- **`use(promise)` in Client Components**: pass a promise created on the server or in a cache, never one created during render.
- **TanStack Query `useSuspenseQuery`**: the cache keeps the promise stable; `data` is always defined.
- **React Router**: return a promise from a loader and render it with `Await` inside `Suspense`.

## Example

```jsx
// Next.js App Router: Server Component starts the fetch, client reads it
import { Suspense } from "react";
import Reviews from "./Reviews";

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id); // awaited: needed for the shell
  const reviewsPromise = getReviews(id); // not awaited: streamed later

  return (
    <>
      <h1>{product.name}</h1>
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Reviews reviewsPromise={reviewsPromise} />
      </Suspense>
    </>
  );
}
```

```jsx
"use client";
import { use } from "react";

export default function Reviews({ reviewsPromise }) {
  const reviews = use(reviewsPromise);
  return reviews.map((r) => <p key={r.id}>{r.text}</p>);
}
```

```jsx
// Client-only app with TanStack Query
import { useSuspenseQuery } from "@tanstack/react-query";

function Todos() {
  const { data } = useSuspenseQuery({
    queryKey: ["todos"],
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
  });
  return data.map((t) => <li key={t.id}>{t.title}</li>);
}
```

## Common mistakes

- `use(fetch(url))` inside a Client Component: a new promise every render, infinite suspension.
- Sequential components each suspending on their own fetch, creating waterfalls; start requests in parallel higher up.
- No error boundary for failed requests.
- Assuming React caches fetch results for you on the client. React's `cache()` only applies to Server Components.

## Follow-up questions

- **How do you avoid waterfalls?** Start all independent requests before any of them is awaited, e.g. in a loader or parent Server Component, and pass promises down.
- **How do you refetch without showing the fallback again?** Trigger the refetch in a transition, or use the library's background refetch which keeps cached data visible.
- **Is `use` allowed in conditions?** Yes, unlike other hooks, `use` can be called conditionally and in loops.

## Quick recap

- Suspense needs a data source that suspends.
- Use frameworks, Suspense-enabled libraries, or `use` with cached promises.
- Render-as-you-fetch avoids waterfalls.
- `useEffect` fetching never suspends.
- Always pair with an error boundary.
