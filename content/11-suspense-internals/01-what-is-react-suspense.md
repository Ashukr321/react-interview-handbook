---
title: "What is React Suspense?"
tags: ["suspense", "loading-states", "async", "basics"]
difficulty: "easy"
---

## Short answer

`Suspense` is a built-in component that shows a `fallback` UI while something inside it isn't ready yet: lazily loaded code, data read with `use`, or data from a Suspense-enabled library or framework. It lets you declare loading states in the tree, in one place, instead of handling `isLoading` flags inside every component. It also powers streaming SSR and selective hydration.

## Explanation

Analogy: a "please wait to be seated" sign at a restaurant. The sign (fallback) shows until the table (content) is ready. The waiters inside don't each hang their own sign.

### What can suspend

| Source | Works with Suspense? |
|---|---|
| `React.lazy(() => import(...))` | Yes |
| `use(promise)` with a cached/stable promise (React 19) | Yes |
| Server Components awaiting data (Next.js App Router) | Yes |
| TanStack Query `useSuspenseQuery`, SWR `suspense: true`, Relay, Apollo `useSuspenseQuery` | Yes |
| `useEffect` + `fetch` + `setState` | No, effects run after render; nothing suspends |

### Basic mental model

```text
<Suspense fallback={<Spinner />}>
   <Profile />  -- not ready? --> show Spinner
                -- ready?     --> show Profile
</Suspense>
```

- A boundary waits for **all** children inside it; it's all-or-nothing for that region.
- The nearest boundary above the suspending component handles it.
- Already shown content won't be replaced by the fallback if the update causing the suspension is a transition.

## Example

```jsx
import { Suspense, lazy, use } from "react";

const Chart = lazy(() => import("./Chart"));

function Dashboard({ statsPromise }) {
  return (
    <>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading stats...</p>}>
        <Stats statsPromise={statsPromise} />
        <Chart />
      </Suspense>
    </>
  );
}

function Stats({ statsPromise }) {
  const stats = use(statsPromise); // suspends until resolved
  return <p>Total users: {stats.users}</p>;
}

// statsPromise is created once, outside render (e.g. in a loader or parent Server Component)
```

## Common mistakes

- Thinking Suspense fetches data. It only coordinates waiting; something else must suspend.
- Expecting `useEffect`-based fetching to trigger the fallback.
- Creating a new promise during each render and passing it to `use`, causing an endless loading loop.
- Forgetting an error boundary; a rejected promise throws to the nearest error boundary, not the Suspense fallback.

## Follow-up questions

- **Was Suspense available before React 18?** Yes, since React 16.6 for `React.lazy` on the client only. React 18 added SSR streaming support and concurrent behaviors; React 19 added `use`.
- **Can you nest Suspense boundaries?** Yes. Each boundary handles suspensions from its own subtree, letting regions load independently.
- **Does Suspense work with class components?** Class components can be inside a boundary and lazy-loaded, but reading data with `use` requires function components.

## Quick recap

- Declarative loading UI via `fallback`.
- Triggered by lazy code, `use`, and Suspense-enabled libraries.
- Nearest boundary catches; all children reveal together.
- Pair with error boundaries.
- Foundation for streaming SSR and Server Components.
