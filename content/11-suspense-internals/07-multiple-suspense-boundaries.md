---
title: "What happens when multiple Suspense boundaries exist?"
tags: ["suspense", "boundaries", "streaming", "ux"]
difficulty: "medium"
---

## Short answer

Each boundary handles only the suspensions in its own subtree, so **sibling boundaries load and reveal independently**: whichever finishes first appears first, without waiting for the others. A suspension always goes to the nearest boundary, so a slow component can't blank out unrelated regions. On the server, each boundary becomes a separate streamed chunk that can also hydrate independently.

## Explanation

Analogy: separate checkout lanes at a supermarket. A slow customer in lane 1 doesn't hold up lane 2. With one lane (one boundary), everyone waits for the slowest.

### One boundary vs several

```text
One boundary:                       Separate boundaries:
<Suspense fallback=PageSkeleton>    <Suspense fallback=A>  <Profile/>  (200 ms)
  <Profile/>   200 ms               <Suspense fallback=B>  <Posts/>    (900 ms)
  <Posts/>     900 ms               <Suspense fallback=C>  <Friends/>  (400 ms)
  <Friends/>   400 ms
                                    t=200 Profile shows
t=900 everything shows at once      t=400 Friends shows
                                    t=900 Posts shows
```

| Aspect | Single boundary | Multiple sibling boundaries |
|---|---|---|
| Time to first content | Slowest request | Fastest request |
| Layout stability | One reveal | Several reveals, possible layout shift |
| Visual noise | Low | Higher if overdone |
| SSR streaming | One chunk | One chunk per boundary |
| Hydration | Together | Independently, prioritized by interaction |

### Details worth knowing

- Data requests in sibling boundaries run in **parallel** only if they're started in parallel. In React 19, when one sibling suspends React commits the fallback, then pre-renders other siblings to kick off their requests.
- Order of reveal follows data arrival, not tree order. Controlling reveal order needs `SuspenseList` (experimental) or grouping content in the same boundary.
- Each boundary needs reserved space (skeletons with the right size) to avoid layout shift.

## Example

```jsx
import { Suspense } from "react";

export default function ProfilePage({ userId }) {
  return (
    <div className="grid">
      <Suspense fallback={<CardSkeleton />}>
        <ProfileCard userId={userId} />
      </Suspense>

      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Posts userId={userId} />
      </Suspense>

      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Friends userId={userId} />
      </Suspense>
    </div>
  );
}
```

## Common mistakes

- Splitting content that only makes sense together (an image and its caption) into separate boundaries.
- Thinking separate boundaries alone make requests parallel; if fetching starts inside each component on render, start them earlier.
- Not sizing skeletons, causing content to jump as each region appears.
- Having dozens of boundaries in a list, creating popcorn-style loading.

## Follow-up questions

- **How do you make two regions appear together?** Put them in the same boundary.
- **Does one boundary's error affect others?** Not if each has its own error boundary; otherwise the error goes to the nearest shared error boundary.
- **Which boundary hydrates first with SSR?** Generally in order of arrival, but React prioritizes any boundary the user interacts with.

## Quick recap

- Each boundary handles its own subtree.
- Siblings reveal independently, as data arrives.
- Each boundary is a streaming and hydration unit.
- Group content that should appear together.
- Reserve space to avoid layout shift.
