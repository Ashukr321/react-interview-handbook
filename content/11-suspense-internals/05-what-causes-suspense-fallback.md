---
title: "What causes Suspense to show a fallback?"
tags: ["suspense", "fallback", "transitions", "internals"]
difficulty: "medium"
---

## Short answer

A fallback is shown when a component inside the boundary suspends during render: a `React.lazy` component whose code hasn't loaded, `use()` on a pending promise, a Suspense-enabled library hook whose data isn't cached yet, or an async Server Component still awaiting. Whether the fallback is actually **committed** depends on the update: on first mount it always is, but if the boundary is already showing content and the update is a transition (or deferred value), React keeps the old content instead.

## Explanation

Analogy: a shop shows a "closed for restock" sign only when it's opening for the first time or when you demand the change "right now". If you say "whenever you're ready" (transition), they keep serving from the old shelves while restocking.

### Decision table

| Situation | Fallback shown? |
|---|---|
| Boundary mounting for the first time, child suspends | Yes |
| Urgent update (plain `setState`) makes visible content suspend | Yes, content hidden and replaced |
| Transition / `useTransition` update makes visible content suspend | No, old UI stays, `isPending` is true |
| `useDeferredValue` render suspends | No, old value's UI stays |
| New boundary mounts inside a transition | Yes, for that new boundary (it has no old content) |
| Promise already resolved and cached | No, renders immediately |
| Data fetched in `useEffect` | Never; nothing suspends |

### Timing details

- **Throttling**: React throttles revealing content in nested boundaries (around 300 ms), so a cascade of small loads reveals in fewer visual steps.
- **No "minimum delay" option**: React doesn't wait before showing a fallback on initial mount. To avoid a flash for fast loads, use transitions so already visible content stays.
- **Retries**: once the promise resolves, React re-renders the boundary; if another child suspends, the fallback stays.

```text
child suspends
   |
is this the boundary's first mount? --yes--> commit fallback
   | no
is the update a transition/deferred? --yes--> keep old UI, wait (isPending)
   | no
hide current content, commit fallback
```

## Example

```jsx
import { Suspense, useState, useTransition } from "react";

function Gallery() {
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {/* Urgent: shows fallback while next page loads */}
      <button onClick={() => setPage((p) => p + 1)}>Next (flash)</button>

      {/* Transition: keeps current photos visible */}
      <button onClick={() => startTransition(() => setPage((p) => p + 1))}>
        Next (smooth)
      </button>

      <Suspense fallback={<GridSkeleton />}>
        <div style={{ opacity: isPending ? 0.5 : 1 }}>
          <Photos page={page} />
        </div>
      </Suspense>
    </>
  );
}
```

## Common mistakes

- Blaming Suspense for flicker when the update wasn't wrapped in a transition.
- Changing the `key` of a `Suspense` boundary itself. That mounts a brand-new boundary with no old content, so it shows its fallback even inside a transition.
- Creating uncached promises, so the fallback appears on every render.
- Expecting the fallback for errors; rejections go to error boundaries.

## Follow-up questions

- **Why does navigation in Next.js App Router not flash?** Navigations run in transitions, so the old page stays until the new segment is ready (or its `loading.js` boundary shows).
- **How do you show the fallback intentionally during a transition?** Give the content a new `key` with its own boundary, or make the update urgent.
- **Do already hidden children keep state?** Yes, on updates the content is hidden, not unmounted.

## Quick recap

- Fallback triggers when a child suspends.
- First mount always shows it.
- Urgent updates replace visible content with it.
- Transitions and deferred values keep old UI.
- Effect-based fetching never triggers it.
