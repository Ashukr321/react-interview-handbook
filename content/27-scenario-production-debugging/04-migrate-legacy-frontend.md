---
title: "You need to migrate a legacy frontend codebase to a modern framework — what's your plan?"
tags: ["migration", "architecture", "strangler-fig", "legacy"]
difficulty: "hard"
---

## Short answer

I avoid a big-bang rewrite. I audit the current app, agree on success metrics, set up the new stack alongside the old one, and migrate incrementally with the strangler fig pattern: route by route or widget by widget, behind feature flags, with tests guarding behavior. The old code is deleted only when traffic on the new path is stable.

## Why it happens

Legacy frontends (jQuery, AngularJS, Backbone, old class-based React with Redux boilerplate) become slow to change: no types, no tests, outdated build tools, security issues in dependencies and difficulty hiring. Rewrites fail when they freeze feature work for months and ship everything at once, so the plan must deliver value continuously.

## How to fix it

### 1. Audit and define goals

- Inventory routes, shared components, global state, API calls and third-party scripts.
- Capture baseline metrics: bundle size, LCP/INP, error rate, build time.
- Agree on "done": e.g. "all checkout routes on React, no jQuery in bundle".

### 2. Build the bridge

```text
            +-------------------------+
 request -> |  Router / reverse proxy  |
            +-----------+-------------+
                        |
         /checkout/*    |    everything else
       +----------------+----------------+
       v                                 v
  New app (React/Next.js)          Legacy app
  shared auth cookie, design tokens, API client
```

Options: proxy-level routing between two apps, or mounting React islands inside legacy pages.

```jsx
// Mount a new React widget inside a legacy page
import { createRoot } from "react-dom/client";
import CartSummary from "./CartSummary";

export function mountCartSummary(el, props) {
  const root = createRoot(el);
  root.render(<CartSummary {...props} />);
  return () => root.unmount(); // legacy code calls this on teardown
}
```

### 3. Migrate in slices

1. Shared foundations first: design system, API client, auth, TypeScript, lint, CI.
2. Low-risk, high-value pages next (settings, a new feature).
3. Core flows last, behind feature flags with gradual rollout.
4. Add characterization tests (Playwright) on the old behavior before replacing it.

### 4. Keep shipping features

New features are built only in the new stack. A migration board tracks remaining legacy surface.

> **⚠️ Gotcha:** Two apps sharing global state is the hardest part. Prefer the URL, the server and cookies as the shared source of truth instead of syncing two client stores.

## How to verify

- Same e2e tests pass against old and new routes.
- Compare error rates and Web Vitals per route during rollout.
- Legacy bundle size and number of legacy routes trend to zero.

## Follow-up questions

- **Why not rewrite from scratch?** It stops delivery, rediscovers old bugs, and you only find integration issues at the end.
- **What about micro-frontends?** Useful when several teams own parts of the app, but they add runtime and ops cost; a proxy split is often enough.
- **How do you get buy-in?** Show metrics (velocity, incidents, performance) and deliver a visible win in the first slice.

## Quick recap

- Audit, set metrics, define "done".
- Strangler fig: run old and new side by side and move slice by slice.
- Shared foundations first, critical flows last behind flags.
- Tests on old behavior protect each step; delete legacy only after stable traffic.
