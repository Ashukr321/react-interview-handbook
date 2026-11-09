---
title: "What is SuspenseList?"
tags: ["suspense", "suspenselist", "experimental", "ux"]
difficulty: "medium"
---

## Short answer

`SuspenseList` is an **experimental** component that coordinates the reveal order of several sibling Suspense boundaries, for example "show them top to bottom" or "show them all together", instead of letting each pop in whenever its data arrives. It is **not available in stable React 18 or 19**; it exists only in experimental/canary builds (recently exported as `unstable_SuspenseList`), and its API may still change. In interviews, say what it does and that you wouldn't ship it in production on stable React.

## Explanation

Analogy: a stage manager deciding the order actors walk on. Even if the third actor is ready first, they wait for their turn so the scene makes sense.

### Props (current experimental design)

| Prop | Values | Meaning |
|---|---|---|
| `revealOrder` | `"forwards"` | Reveal in tree order; an item waits for all items before it |
| | `"backwards"` | Reveal from the last item upward |
| | `"together"` | Reveal all items at once when all are ready |
| `tail` | `"collapsed"` | Show only the next pending fallback, not all of them |
| | `"hidden"` | Show no fallbacks for pending items after the revealed ones |

### Why it exists

```text
Without SuspenseList (data arrives 3, 1, 2):
  [skeleton] [skeleton] [Item 3]  -> [Item 1] [skeleton] [Item 3] -> all
  content jumps around, reading order breaks

With revealOrder="forwards" tail="collapsed":
  [skeleton]  -> [Item 1] [skeleton] -> [Item 1] [Item 2] [Item 3]
  reads top to bottom, only one skeleton at a time
```

### Stable alternatives today

- Put items that must appear together in **one** Suspense boundary.
- Use **nested** boundaries to force order (outer first, inner after).
- Stream ordered content from the server with nested boundaries.
- Size skeletons so out-of-order reveals don't shift layout.

## Example

```jsx
// Experimental/canary React only. Import name may differ between releases.
import { Suspense, unstable_SuspenseList as SuspenseList } from "react";

function Feed({ postPromises }) {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      {postPromises.map((p) => (
        <Suspense key={p.id} fallback={<PostSkeleton />}>
          <Post postPromise={p.promise} />
        </Suspense>
      ))}
    </SuspenseList>
  );
}
```

```jsx
// Stable alternative: nesting forces top-to-bottom order
import { Suspense } from "react";

function OrderedTwo({ a, b }) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <Post postPromise={a} />
      <Suspense fallback={<PostSkeleton />}>
        <Post postPromise={b} />
      </Suspense>
    </Suspense>
  );
}
```

## Common mistakes

- Claiming `SuspenseList` shipped in React 18 or 19 stable. It didn't.
- Thinking it changes fetch order. It only changes reveal order; requests still run in parallel.
- Wrapping non-Suspense children and expecting coordination; it coordinates direct child boundaries.
- Using experimental APIs in production code without pinning versions.

## Follow-up questions

- **Why hasn't it shipped?** The React team has kept iterating on its semantics (including defaults for `revealOrder` and SSR streaming behavior), so it stayed experimental.
- **Does it work with streaming SSR?** The experimental implementation has been extended to streaming, but treat that as unstable.
- **What's the closest stable tool?** Grouping or nesting boundaries.

## Quick recap

- Coordinates reveal order of sibling boundaries.
- `revealOrder`: forwards, backwards, together.
- `tail`: collapsed or hidden.
- Experimental only, not in stable React 18/19.
- Use grouping or nesting in production.
