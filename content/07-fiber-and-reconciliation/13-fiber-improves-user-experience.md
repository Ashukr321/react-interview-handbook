---
title: "How does Fiber improve user experience?"
tags: ["fiber", "performance", "ux", "concurrent"]
difficulty: "medium"
---

## Short answer

Fiber keeps the UI responsive during heavy updates. Because rendering is split into small units with priorities, urgent interactions (typing, clicking) can be handled immediately while expensive renders happen in the background, get interrupted, or show the old UI until the new one is ready. It also enables Suspense-based loading states and streaming SSR with selective hydration.

## Explanation

Users notice **latency of their own input** far more than total render time. Fiber targets exactly that.

### UX improvements built on Fiber

| Feature | User-visible benefit |
|---|---|
| Time slicing (5 ms chunks) | Long renders don't freeze the page; animations and scroll stay smooth |
| Lanes / priorities | Keystrokes and clicks render before slow background updates |
| `useTransition` | Keeps the current screen interactive and shows a pending indicator instead of a frozen tab |
| `useDeferredValue` | Input updates instantly; an expensive list catches up afterward |
| Suspense | Declarative loading fallbacks; no layout thrash from scattered spinners |
| Transitions + Suspense | Already-visible content isn't replaced by a fallback during navigation |
| Selective hydration (SSR) | Parts the user clicks hydrate first; page becomes interactive sooner |
| Single atomic commit | No half-updated, inconsistent screens |

Analogy: a restaurant kitchen with a head chef who can drop a long braise to plate a quick dessert for a waiting table, then go back to the braise. Total cooking is the same, but no guest waits needlessly.

```text
Without Fiber priorities:
  type "a" -> [render 300ms list] -> "a" appears (laggy input)

With transition:
  type "a" -> "a" appears (SyncLane) -> list renders in slices, interrupted by "b"
```

## Example

```jsx
import { useState, useDeferredValue, Suspense, memo } from "react";

export default function ProductSearch() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Suspense fallback={<p>Loading…</p>}>
        <div style={{ opacity: isStale ? 0.5 : 1 }}>
          <Results query={deferredQuery} />
        </div>
      </Suspense>
    </>
  );
}

const Results = memo(function Results({ query }) {
  // expensive filtering / rendering of many rows
  return <ul>{/* ... */}</ul>;
});
```

## Common mistakes

- Claiming Fiber makes rendering faster overall. It improves **perceived** performance and responsiveness; CPU work is similar or slightly higher.
- Wrapping everything in transitions. Text input value updates must stay urgent, or the input lags.
- Forgetting `memo` with `useDeferredValue`; without it, the child re-renders urgently with the parent anyway.

## Follow-up questions

- **Which metric does this help?** Interaction to Next Paint (INP), since the main thread is freed sooner after input.
- **Does it help initial load?** Indirectly, through streaming SSR and selective hydration in React 18+ frameworks like Next.js App Router.
- **What if a single component is slow?** Fiber can't split one function call; optimize or split that component.

## Quick recap

- Fiber prioritizes user input over background rendering.
- Time slicing prevents long frozen frames.
- Transitions, deferred values and Suspense give smoother loading UX.
- Better responsiveness, not less total work.
