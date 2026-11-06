---
title: "What is Suspense in React?"
tags: ["suspense", "concurrent", "architecture", "code-splitting"]
difficulty: "medium"
---

## Short answer

`<Suspense>` is a boundary that shows a fallback while something inside it is not ready yet: a lazy-loaded component, data read through a Suspense-enabled source (`use(promise)`, Next.js, React Router, TanStack Query's `useSuspenseQuery`), or streamed server HTML. Architecturally, it lets you decide loading states by layout region instead of writing `if (loading)` in every component.

## Explanation

Think of Suspense boundaries as the "under construction" signs in a building. You choose where to hang them: one for the whole floor (route) or one per room (widget). Wherever a sign hangs, everything behind it appears together when ready.

### Where to place boundaries in an app

- **Route level**: wrap lazy routes so navigating to an unloaded page shows a page skeleton.
- **Independent widgets**: a dashboard where sales, inventory and alerts load separately; each gets its own boundary so a slow one does not block the rest.
- **Below the fold**: comments, recommendations, anything not critical for first paint.
- **Not around every tiny component**: too many boundaries cause "popcorn" UI with spinners popping in everywhere.

### What it works with

| Feature | Role |
|---|---|
| `React.lazy` | Code splitting; the chunk downloads on first render |
| `use(promise)` (React 19) | Read a cached promise; suspends until it resolves |
| Server Components / streaming SSR | Server sends the shell first, then streams each boundary's HTML as it resolves |
| `startTransition` | Keeps the old UI on screen instead of replacing it with a fallback during navigation |
| Error boundaries | Suspense handles "pending"; an error boundary handles "failed" |

```text
 Page shell (renders immediately)
   |-- Suspense: Header        -> ready
   |-- Suspense: SalesChart    -> fallback ... ready later
   '-- Suspense: Comments      -> fallback ... ready later (streamed)
```

## Example

```jsx
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "react-error-boundary";

const SalesChart = lazy(() => import("./SalesChart"));
const Alerts = lazy(() => import("./Alerts"));

export default function Dashboard() {
  return (
    <main>
      <h1>Dashboard</h1>
      <ErrorBoundary fallback={<p>Chart failed to load.</p>}>
        <Suspense fallback={<div className="skeleton chart" />}>
          <SalesChart />
        </Suspense>
      </ErrorBoundary>
      <Suspense fallback={<div className="skeleton list" />}>
        <Alerts />
      </Suspense>
    </main>
  );
}
```

## Common mistakes

- Thinking Suspense fetches data by itself; the data source must support it.
- Creating a new promise during render for `use()`, which suspends forever; the promise must be cached or come from a parent/server.
- One giant boundary at the root, so any slow part blanks the entire page.
- Forgetting an error boundary, so a failed chunk or request crashes the tree.

## Follow-up questions

- **Why does my page flash a spinner on every navigation?** The update is urgent; wrap navigation in `startTransition` (routers do this) to keep the previous screen visible.
- **What is `SuspenseList`?** An experimental API to coordinate reveal order of multiple boundaries; not stable yet.
- **How does Suspense help SEO and performance with SSR?** Streaming sends meaningful HTML early and hydrates boundaries independently (selective hydration), improving FCP and responsiveness.

## Quick recap

- Suspense shows a fallback for not-ready children.
- Place boundaries by layout region: routes, independent widgets, below-the-fold content.
- Works with `lazy`, `use()`, Suspense-enabled data libraries and streaming SSR.
- Pair with error boundaries and transitions.
