---
title: "How does Suspense work internally?"
tags: ["suspense", "internals", "fiber", "use"]
difficulty: "hard"
---

## Short answer

When a component can't render yet, it **suspends**: historically by throwing a promise (thenable), and in React 19 by calling `use(promise)`, which throws an internal `SuspenseException` while tracking the thenable. React's work loop catches it, walks up to the nearest `Suspense` fiber, marks it to capture, and re-renders that boundary showing its `fallback` while keeping the primary children in a hidden Offscreen fiber. React attaches a "ping/retry" listener to the promise; when it resolves, React schedules a retry render, and this time the component reads the resolved value and the real content is shown.

## Explanation

Analogy: a chef (render) asks for an ingredient that isn't delivered yet. Instead of freezing the kitchen, they put up a "coming soon" card (fallback), leave a note with the supplier ("call me when it arrives"), and work on other dishes. When the supplier calls, the chef re-cooks the dish.

### The flow

```text
render <Comments/>
   |
   use(promise) -> promise pending -> throw SuspenseException (thenable tracked)
   |
handleThrow / throwException (work loop catches)
   |
find nearest Suspense fiber -> mark ShouldCapture
attach listeners: promise.then(retry / ping)
   |
unwind to boundary -> re-render boundary with fallback
   primary children kept in an Offscreen fiber (state preserved, hidden)
   |
commit fallback
   |
promise resolves -> retry scheduled (RetryLane)
   |
render <Comments/> again -> use(promise) returns resolved value
   |
commit real content, remove fallback
```

### Important internals

- **Thenable tracking**: `use` reads `promise.status` / `value` / `reason` fields React sets on the thenable, so on retry it returns synchronously without suspending again. That's why the promise must be the **same object** across renders (cached).
- **State preservation**: on updates, already-mounted children of the boundary are hidden (`display: none` style in the DOM via Offscreen), not destroyed, so their state survives.
- **Transitions**: if the suspending update is a transition and the boundary already shows content, React doesn't commit the fallback; it waits and keeps the old UI.
- **Sibling pre-warming (React 19)**: when a component suspends, React commits the fallback immediately, then pre-renders the remaining siblings in the background so their data requests start too.
- **Errors**: a rejected promise is rethrown on retry and caught by the nearest error boundary.
- **Throwing a promise directly** still works for legacy libraries but is an undocumented implementation detail; `use` is the supported API.

## Example

```jsx
import { Suspense, use } from "react";

// A tiny cache so the same promise is reused across renders
const cache = new Map();
function fetchUser(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`/api/users/${id}`).then((r) => r.json()));
  }
  return cache.get(id);
}

function User({ id }) {
  const user = use(fetchUser(id)); // suspends first time, returns value on retry
  return <h2>{user.name}</h2>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading user...</p>}>
      <User id={42} />
    </Suspense>
  );
}
```

## Common mistakes

- Creating a new promise every render; each retry suspends again, forever.
- Thinking the component "pauses" mid-function. It throws, and React calls it again from the top later.
- Running side effects in render before the suspending call; they run again on every retry.
- Assuming state inside a suspending component survives. On first mount nothing is committed, so there's no state to keep.

## Follow-up questions

- **Why did React move from throwing promises to `use`?** `use` can be called conditionally, works with Server Components, has official semantics, and lets React track thenable status itself.
- **What is a "ping" vs a "retry"?** A ping re-attempts a render that suspended before commit (e.g. inside a transition); a retry re-renders a boundary that already committed its fallback.
- **Can you `use` a promise inside a Client Component created in render?** Not reliably. Create it in a Server Component, loader, or cache, and pass it down.

## Quick recap

- Suspending = throwing (via `use`) during render.
- Nearest Suspense fiber captures and renders the fallback.
- Children stay mounted but hidden in an Offscreen fiber on updates.
- Promise resolution schedules a retry render.
- Promises must be stable/cached.
