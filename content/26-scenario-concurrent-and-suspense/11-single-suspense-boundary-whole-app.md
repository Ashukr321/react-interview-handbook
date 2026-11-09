---
title: "Why is a single Suspense boundary around the whole app usually not ideal?"
tags: ["suspense", "architecture", "loading-states", "streaming"]
difficulty: "medium"
---

## Short answer

With one boundary at the root, **any** component that suspends anywhere replaces the **entire app** with the fallback. The navigation, the forms the user was filling in and everything already loaded disappear. Nothing appears until the slowest piece is ready, streaming SSR can't send content early, and loading becomes all-or-nothing. A root boundary is fine as a last-resort safety net, but you need finer boundaries around routes, layouts and widgets underneath it.

## Why it happens

A suspension bubbles up to the **nearest** boundary. If that's the root, the root's fallback replaces everything below it.

```text
<Suspense fallback={<FullPageSpinner/>}>   ← only boundary
  <Nav/>
  <Sidebar/>
  <Page>
    <Profile/>          ready
    <Notifications/>    suspends (slow API) ──► whole app → FullPageSpinner
  </Page>
</Suspense>
```

Problems this causes:

| Problem | Effect |
| --- | --- |
| All-or-nothing reveal | First meaningful paint waits for the slowest request |
| Global flashes | A small widget refetch (outside a transition) blanks the whole UI |
| Lost context | Nav and layout vanish, which disorients users |
| No streaming benefit | The server can't flush content sections independently |
| Big layout shift | A full-page spinner swaps for a full page |
| Hidden waterfalls | Everything appears "slow" with no clue which part is slow |

Note: hiding content behind a fallback doesn't destroy its state (React keeps hidden trees for already-mounted content), but the user still loses sight of it and can't interact with it.

## How to fix it

Layer your boundaries:

1. **Root** boundary: a safety net for anything unexpected.
2. **Route/layout** level: inside the shell, so navigation always stays visible.
3. **Section/widget** level: independent data areas.
4. **Transitions for navigations and filter changes**, so already-shown content isn't replaced by fallbacks.

```jsx
import { Suspense } from "react";
import { Outlet } from "react-router";

export default function AppLayout() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>   {/* safety net */}
      <Nav />                                     {/* never suspends */}
      <Sidebar />
      <main>
        <Suspense fallback={<PageSkeleton />}>   {/* route-level */}
          <Outlet />
        </Suspense>
      </main>
    </Suspense>
  );
}

export function DashboardPage() {
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}><Stats /></Suspense>       {/* widget-level */}
      <Suspense fallback={<FeedSkeleton />}><ActivityFeed /></Suspense>
    </>
  );
}
```

In Next.js App Router, `loading.js` files create route-segment boundaries automatically, and you add `<Suspense>` inside pages for individual sections.

> **💡 Interview tip:** Pair boundaries at each level with Error Boundaries. The same "nearest boundary wins" rule applies to errors, so a single root Error Boundary turns one broken widget into a crashed app.

## How to verify

- Delay one widget's API: only that widget shows a skeleton, and the nav and other widgets stay.
- Navigate between routes: the shell stays mounted and visible.
- Streamed SSR responses show multiple flushed chunks instead of one.

## Follow-up questions

- **Is a root boundary useless then?** No. It's a good fallback for unexpected suspensions; it just shouldn't be the only one.
- **Can too many boundaries hurt?** Yes. Random pop-in and layout shift. Group things that should appear together.
- **Why does navigation sometimes not show the fallback?** Router navigations run as transitions, so React keeps the old page visible until the new one is ready.

## Quick recap

- A suspension goes to the nearest boundary; at the root, that's the whole app.
- One boundary means all-or-nothing loading, global flashes and no streaming.
- Layer boundaries: root safety net, route, widget.
- Use transitions and matching Error Boundaries at each level.
