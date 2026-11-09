---
title: "A page contains three independent API sections. How would you use Suspense?"
tags: ["suspense", "data-fetching", "streaming", "server-components", "use"]
difficulty: "medium"
---

## Short answer

Give each section **its own Suspense boundary** with a skeleton fallback, and make sure all three requests **start in parallel**. Each section then appears as soon as its own data arrives: a fast section isn't held back by a slow one, and one slow API never blanks the whole page. In Next.js App Router this is just three async Server Components each wrapped in `<Suspense>`, which React streams independently. On the client, use a Suspense-enabled data layer (`use()` with cached promises, or TanStack Query's `useSuspenseQuery`).

## Why it happens

A Suspense boundary is the unit of "loading together". When a component suspends, React shows the fallback of the **nearest** boundary above it.

```text
One boundary around all three:
  [ Profile 200ms ][ Orders 800ms ][ Recs 2s ]  → page skeleton for 2s, then everything

Three boundaries:
  t=200ms  Profile ✔   Orders ⌛  Recs ⌛
  t=800ms  Profile ✔   Orders ✔  Recs ⌛
  t=2s     Profile ✔   Orders ✔  Recs ✔
```

The other trap is a **waterfall**: if one section's fetch only starts after another finishes (nested awaits, or fetch-on-render inside a single boundary), the total time is the sum, not the max.

## How to fix it

### Server Components (Next.js App Router)

```jsx
// app/account/page.jsx
import { Suspense } from "react";

export default function AccountPage() {
  return (
    <main className="grid">
      <Suspense fallback={<CardSkeleton title="Profile" />}>
        <ProfileSection />
      </Suspense>
      <Suspense fallback={<CardSkeleton title="Orders" />}>
        <OrdersSection />
      </Suspense>
      <Suspense fallback={<CardSkeleton title="Recommended" />}>
        <RecommendationsSection />
      </Suspense>
    </main>
  );
}

async function OrdersSection() {
  const orders = await getOrders(); // each section awaits only its own data
  return <OrdersTable orders={orders} />;
}
```

The HTML shell and the skeletons stream first, and each section streams in as its promise resolves. All three start in parallel because they sit in separate boundaries.

### Client-side

```jsx
import { Suspense, use } from "react";

// Start all requests up front (e.g. in a route loader or cache), not inside render
export default function AccountPage({ profilePromise, ordersPromise, recsPromise }) {
  return (
    <>
      <Suspense fallback={<CardSkeleton />}><Profile promise={profilePromise} /></Suspense>
      <Suspense fallback={<CardSkeleton />}><Orders promise={ordersPromise} /></Suspense>
      <Suspense fallback={<CardSkeleton />}><Recs promise={recsPromise} /></Suspense>
    </>
  );
}

function Orders({ promise }) {
  const orders = use(promise);
  return <OrdersTable orders={orders} />;
}
```

> **⚠️ Gotcha:** Don't create the promise inside the component that calls `use()`. A new promise on each render suspends forever. Promises must come from a cache, a loader, or a Server Component.

Also wrap each section in an **Error Boundary**, so one failed API shows an inline error instead of breaking the page.

## How to verify

- Network panel: all three requests start at the same time (parallel bars, no staircase).
- Throttle one endpoint (DevTools request blocking or a delay); only that section keeps its skeleton.
- For SSR, view the streamed response: the shell arrives first, then the section chunks.

## Follow-up questions

- **What if two sections should appear together?** Put them in the same boundary; boundaries define reveal groups.
- **Does Suspense fetch data?** No. It coordinates loading UI; the data source must integrate with Suspense.
- **How do you avoid layout shift?** Size skeletons to match the final content.

## Quick recap

- One boundary per independent section.
- Start every request in parallel; avoid waterfalls.
- Server Components + Suspense stream sections independently.
- Pair every boundary with an Error Boundary.
