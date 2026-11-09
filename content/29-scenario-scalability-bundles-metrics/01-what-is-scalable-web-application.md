---
title: "What does \"scalable web applications\" mean in your experience?"
tags: ["scalability", "architecture", "frontend"]
difficulty: "medium"
---

## Short answer

A scalable web application keeps working well as three things grow: users and traffic, data and features, and the team building it. On the frontend that means fast pages for every user no matter the load (static assets on a CDN, caching, small bundles), a codebase that new features can join without slowing everything down (modular architecture, clear state boundaries, a design system), and processes that let many developers ship safely (types, tests, CI, feature flags).

## Explanation

Think of a restaurant. Scaling is not only having more tables (traffic). The kitchen has to handle a bigger menu (features and data), and more cooks have to work without bumping into each other (team). A good answer covers all three.

### Three dimensions of scale

| Dimension | What grows | Frontend practices |
| --- | --- | --- |
| Traffic | Concurrent users, regions | CDN, SSG/ISR, edge caching, HTTP caching, fewer API calls |
| Data and features | Records, screens, interactions | Pagination, virtualization, code splitting, normalized state, server state libraries |
| Team and codebase | Developers, teams, releases | Feature-based folders, TypeScript, design system, monorepo, tests, CI, flags |

### Traffic

The frontend scales well when most of it is static: hashed JS/CSS files on a CDN can serve millions of users cheaply. Server-rendered pages scale with caching (static generation, incremental revalidation, `Cache-Control` headers). The client must also protect the backend: deduplicate requests, cache responses, and back off on errors.

### Data and features

Pages must not slow down as data grows: paginate APIs, virtualize long lists, and fetch only the fields you need. Bundle size must not grow with every feature: split by route and lazy-load heavy widgets.

### Team and codebase

```text
src/
  features/
    checkout/   (components, hooks, api, tests)
    search/
  shared/
    ui/         (design system)
    lib/        (api client, utils)
```

Feature folders with clear public APIs let teams work independently. At larger sizes, a monorepo (Nx, Turborepo) or micro-frontends split ownership further.

## Example

```jsx
// Route-level splitting keeps the initial bundle small as features grow
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";

const Checkout = lazy(() => import("./features/checkout/CheckoutPage"));
const Reports = lazy(() => import("./features/reports/ReportsPage"));

export const router = createBrowserRouter([
  { path: "/checkout", element: <Suspense fallback={<PageSkeleton />}><Checkout /></Suspense> },
  { path: "/reports", element: <Suspense fallback={<PageSkeleton />}><Reports /></Suspense> },
]);
```

> **💡 Interview tip:** Give a concrete story: "We went from 5k to 200k daily users; we moved pages to SSG plus a CDN, added React Query caching, and split the bundle by route, so p75 LCP stayed under 2.5 s."

## Common mistakes

- Talking only about servers and load balancers; interviewers want the frontend's role too.
- Treating scalability as performance alone and forgetting codebase and team scale.
- Adding micro-frontends or complex architecture before there is a real team-scale problem.

## Follow-up questions

- **How does a CDN help scalability?** It serves static assets from edge locations, offloading the origin and reducing latency for global users.
- **When do micro-frontends make sense?** When several independent teams need to deploy parts of one product separately.
- **How do you know it scales?** Load tests, Web Vitals at p75 under real traffic, and stable build and deploy times as the team grows.

## Quick recap

- Scale has three axes: traffic, data/features, team.
- Static assets on CDNs and caching handle traffic.
- Pagination, virtualization and code splitting handle data and features.
- Modular architecture, types, tests and CI handle team growth.
