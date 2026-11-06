---
title: "How do transitions improve UX?"
tags: ["transitions", "ux", "concurrent", "suspense"]
difficulty: "medium"
---

## Short answer

Transitions keep the app responsive while expensive or data-dependent updates happen. Inputs and buttons react instantly because urgent updates can interrupt the transition render, and already visible content stays on screen instead of flashing to a spinner. With `isPending`, you can show a subtle indicator rather than blocking the whole page.

## Explanation

Without transitions, a slow render behaves like a single-lane road: the next car (your keypress) waits until the truck in front (a 300 ms list render) is done. Transitions add an overtaking lane.

### Concrete UX wins

| Problem without transitions | With transitions |
|---|---|
| Typing in a filter box stutters on large lists | Input updates immediately; list catches up |
| Clicking a tab freezes the page until the tab renders | Old tab stays interactive; new one appears when ready |
| Navigating replaces the page with a full-screen fallback | Old page stays visible with a pending indicator |
| Rapid clicks render every intermediate state | Only the latest state is rendered |
| Spinners flash for 50 ms on fast networks | No fallback for revealed content, so no flash |

### The "receded" vs "pending" states

React's design distinguishes two loading experiences:

- **Receded**: visible content is replaced by a fallback. Feels like going backwards.
- **Pending**: the current screen stays, maybe dimmed, until the next one is ready. Feels like progress.

Transitions turn receded states into pending ones. That is why routers like React Router (v6.4+ data routers, v7) and the Next.js App Router run navigations inside transitions.

## Example

```jsx
import { Suspense, useState, useTransition } from "react";

function App() {
  const [userId, setUserId] = useState(1);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        onClick={() => startTransition(() => setUserId((id) => id + 1))}
      >
        Next user
      </button>
      <Suspense fallback={<ProfileSkeleton />}>
        <div style={{ opacity: isPending ? 0.6 : 1 }}>
          {/* Profile suspends while loading; old profile stays visible */}
          <Profile id={userId} />
        </div>
      </Suspense>
    </>
  );
}
```

Without `startTransition`, clicking "Next user" would replace the profile with `ProfileSkeleton`. With it, the previous profile stays, dimmed, until the next one loads.

## Common mistakes

- Using `isPending` to show a full-screen loader, which recreates the receded state.
- Expecting transitions to fix slow components on their own. If a single component takes 500 ms to render, React cannot split that component; break the work into smaller components or memoize.
- Forgetting that a transition does not stop network requests; you may still need cancellation.
- Wrapping everything in transitions, making even direct feedback feel delayed.

## Follow-up questions

- **Can transitions make the app feel slower?** They can delay showing new content slightly, which is why you pair them with `isPending` feedback.
- **How does this help Core Web Vitals?** Yielding during rendering reduces long tasks, which improves Interaction to Next Paint (INP).
- **What about initial page load?** Transitions matter for updates; for the first load, Suspense boundaries and streaming SSR do the heavy lifting.

## Quick recap

- Inputs stay responsive during heavy renders.
- Old UI stays visible instead of flashing fallbacks.
- Intermediate states are skipped.
- `isPending` enables subtle feedback.
- Improves INP by breaking up long tasks.
