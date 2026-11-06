---
title: "How do you decide which library to use in a project?"
tags: ["decision-making", "architecture", "dependencies", "bundle-size"]
difficulty: "medium"
---

## Short answer

First I check whether we need a library at all: the platform, the framework or code we already have may solve it. If we do, I compare two or three candidates on problem fit, maintenance health, bundle size, TypeScript and SSR/React 19 support, security, license and team familiarity, then record the decision with its exit cost. A dependency is a long-term commitment, so I choose it like hiring, not like shopping.

## Explanation

### Step 1: Do we need it?

- **Platform**: `Intl.DateTimeFormat`, `fetch`, `structuredClone`, `URLSearchParams`, CSS `:has()` and container queries replace many old libraries.
- **Already installed**: if the app uses TanStack Query, do not add SWR for one screen.
- **Ten lines of code**: a `debounce` helper does not justify a dependency.

### Step 2: Score the candidates

| Criterion | What I check |
|---|---|
| Problem fit | Solves our case without fighting the API |
| Maintenance | Recent releases, open issue response time, more than one maintainer |
| Adoption | npm downloads, GitHub usage, community answers |
| Bundle cost | Size on bundlephobia / pkg-size, tree-shakeable ESM |
| Compatibility | React 19, Server Components, SSR, our bundler |
| Types | First-class TypeScript types |
| Security | `npm audit`, Snyk/Socket report, transitive dependency count |
| License | MIT/Apache are safe; GPL may be a problem for commercial code |
| Docs and DX | Clear docs, examples, devtools |
| Team | Does the team know it? Can we hire for it? |
| Exit cost | How hard to remove if it is abandoned? |

### Step 3: Prove it and record it

Build a small spike on a real screen, measure bundle and performance impact, then write a short ADR (Architecture Decision Record): context, options, decision, consequences. Wrap the library behind your own module so swapping it later touches one file.

> **💡 Interview tip:** Give a real example: "We picked React Hook Form over Formik because Formik was barely maintained and re-rendered the whole form on each keystroke."

## Example

Avoiding a dependency and isolating the one we do add:

```js
// Instead of adding moment.js (~70 KB min+gzip with locales), use the platform
export const formatDate = (date, locale = "en-IN") =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(date));

// When a library is needed, wrap it so the rest of the app never imports it directly
// charts.js
import { lazy } from "react";
export const SalesChart = lazy(() => import("./SalesChartImpl")); // heavy lib loads only when used
```

## Common mistakes

- Choosing by GitHub stars alone; stars do not mean active maintenance.
- Ignoring transitive dependencies and their security surface.
- Importing a heavy library on the main route instead of lazy loading it.
- Not checking Server Components or SSR support before adopting a UI library.

## Follow-up questions

- **How do you handle a library that becomes abandoned?** Because it is wrapped behind our own module, we swap the implementation in one place, or fork it short-term if the fix is small.
- **How do you prevent dependency bloat over time?** Bundle size budgets in CI (size-limit), periodic dependency reviews and Renovate/Dependabot for updates.
- **Build vs buy?** Build when it is core to the product or tiny; buy (adopt) when it is a solved, complex problem like dates, forms, virtualization or accessibility primitives.

## Quick recap

- First ask whether the platform or existing code already solves it.
- Compare candidates on fit, maintenance, size, compatibility, security and license.
- Spike it on real code and measure.
- Record the decision in an ADR and wrap the library to keep exit cost low.
