---
title: "What is a transition update?"
tags: ["concurrent", "transitions", "lanes", "internals"]
difficulty: "medium"
---

## Short answer

A transition update is a state update scheduled inside `startTransition` (or produced by `useDeferredValue`). React assigns it a **transition lane**, renders it concurrently with time slicing, lets urgent updates interrupt it, and avoids replacing already visible content with Suspense fallbacks while it is pending. It represents a move from one view to another, not direct feedback to the user's input.

## Explanation

React's team splits updates into two categories:

- **Urgent updates** reflect direct interaction: typing, clicking, pressing. Users expect them instantly.
- **Transition updates** move the UI between views: showing search results, switching tabs, navigating. Users tolerate a short delay as long as the current screen stays usable.

Analogy: pressing an elevator button should light up immediately (urgent), but the elevator itself can take a few seconds to arrive (transition).

### Properties of a transition update

| Property | Meaning |
|---|---|
| Interruptible | Urgent work can pause or discard the in-progress render |
| Restartable | React re-renders from the latest state, skipping stale intermediate states |
| Suspense-friendly | If it suspends, React keeps the old UI rather than showing a fallback for revealed content |
| Batched | Multiple transitions started together are rendered together |
| Lower priority | Uses one of several transition lanes, below sync, input and default lanes |

### Lifecycle

```text
startTransition(() => setTab("posts"))
        |
        v
 update queued in TransitionLane
        |
        v
 concurrent render (yields every ~5ms)
        |---- urgent click arrives? --> pause/discard, handle urgent, restart
        |---- component suspends?   --> keep old UI, wait for promise
        v
 commit (DOM updated in one go, isPending -> false)
```

The commit phase is never interruptible. Only the render phase (calling your components and diffing) is.

## Example

```jsx
import { useState, useTransition } from "react";

function Router() {
  const [page, setPage] = useState("/");
  const [isPending, startTransition] = useTransition();

  function navigate(url) {
    // A navigation is a transition: the old page stays interactive.
    startTransition(() => setPage(url));
  }

  return (
    <Layout busy={isPending}>
      {page === "/" ? (
        <Home onOpen={() => navigate("/report")} />
      ) : (
        <SlowReport />
      )}
    </Layout>
  );
}
```

## Common mistakes

- Thinking transitions run in a Web Worker or another thread. They run on the main thread; they just yield often.
- Assuming the commit phase can be interrupted. Only rendering is.
- Believing transitions skip effects. Effects run normally after commit.
- Marking updates that must reflect user input exactly (input values, checkbox state) as transitions.

## Follow-up questions

- **Can a transition be "lost"?** Intermediate states can be skipped if newer updates supersede them, but the final state always renders.
- **How many transition lanes exist?** React has a pool of transition lanes (around 14 in recent versions) so independent transitions can be tracked and entangled when needed.
- **Do transitions work in React Native?** Yes, with the New Architecture, which uses the concurrent renderer.

## Quick recap

- Transition = non-urgent move between views.
- Gets a transition lane; render is interruptible and restartable.
- Keeps visible content instead of fallbacks when suspending.
- Commit is still synchronous.
- Created by `startTransition`, `useTransition` or `useDeferredValue`.
