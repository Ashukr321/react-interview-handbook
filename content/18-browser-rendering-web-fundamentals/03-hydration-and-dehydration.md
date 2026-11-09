---
title: "What is hydration and dehydration?"
tags: ["ssr", "hydration", "react-query", "nextjs"]
difficulty: "medium"
---

## Short answer

Hydration is the step where React, running in the browser, takes HTML that was already rendered on the server and attaches event handlers and state to it, instead of rebuilding the DOM. Dehydration is the reverse side of the same idea for data: the server serializes its state (for example a TanStack Query cache or Redux store) into the HTML, and the client rehydrates that state so it does not refetch. Together they let a page show content immediately and become interactive without duplicating work.

## Explanation

Server-rendered HTML is like a printed photo of a working app: it looks right, but the buttons do nothing. Hydration is React walking through the photo, matching each element to its component, and wiring up the electricity. Dehydration is packing the app's memory into a suitcase on the server, so the browser can unpack it instead of buying everything again.

### Hydration flow

```text
Server: render <App/> → HTML + serialized data
Browser: show HTML (looks ready, not interactive)
       → download JS
       → hydrateRoot(): React renders in memory, compares with existing DOM,
         attaches listeners, keeps the DOM nodes
       → interactive
```

### Hydration mismatches

If the client render differs from the server HTML (dates, `Math.random()`, `window` checks, locale formatting, browser extensions changing the DOM), React logs a hydration error and may re-render that subtree on the client, losing the SSR benefit for it.

Fixes:

- Render the same thing on both sides, then change it in `useEffect` after mount.
- Use `useId` for IDs instead of random values.
- `suppressHydrationWarning` for unavoidable single-element differences like timestamps.

### Modern hydration in React 18/19

- **Selective hydration**: with `Suspense`, React hydrates parts of the page independently and prioritizes the part the user interacts with.
- **Streaming**: HTML arrives in chunks, and each chunk can hydrate when its JS is ready.
- **Server Components** ship no JS, so there is nothing to hydrate for them; only `"use client"` components hydrate.

### Dehydration with TanStack Query

The server prefetches queries, calls `dehydrate(queryClient)`, and passes the result to the client, which wraps the tree in `HydrationBoundary`. The client cache starts filled, so no loading spinner or duplicate request.

## Example

Plain React SSR hydration:

```jsx
// client entry
import { hydrateRoot } from "react-dom/client";
import App from "./App";

hydrateRoot(document.getElementById("root"), <App />);
```

TanStack Query dehydrate/hydrate in the Next.js App Router:

```tsx
// app/posts/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import Posts from "./Posts";

export default async function PostsPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("https://api.example.com/posts").then((r) => r.json()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
    </HydrationBoundary>
  );
}
```

```tsx
// app/posts/Posts.tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export default function Posts() {
  const { data } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("https://api.example.com/posts").then((r) => r.json()),
  });
  return <ul>{data?.map((p: { id: number; title: string }) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

## Common mistakes

- Using `createRoot` instead of `hydrateRoot` on server-rendered HTML, which throws away and rebuilds the DOM.
- Reading `window`, `localStorage` or `Date.now()` during render, causing mismatches.
- Serializing sensitive server data into the page during dehydration; anything dehydrated is visible in the HTML.
- Assuming the page is interactive as soon as it is visible (the "uncanny valley" before hydration finishes).

## Follow-up questions

- **What is partial or progressive hydration?** Hydrating only some components, or hydrating them over time; React does this through `Suspense` boundaries, and islands frameworks like Astro do it per component.
- **What is resumability?** An approach (Qwik) that avoids hydration by serializing enough state that the client can resume without re-running components.
- **How do you debug hydration errors?** React 19 shows a diff of server vs client output in the console; look for non-deterministic values in render.

## Quick recap

- Hydration: attach React to server HTML instead of rebuilding it.
- Dehydration: serialize server state into HTML for the client to reuse.
- Server and client renders must match.
- Selective hydration and RSC reduce hydration cost.
