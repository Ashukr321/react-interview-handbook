---
title: "What debugging and SSR improvements came in React 19.1 and 19.2?"
tags: ["react-19-1", "react-19-2", "owner-stack", "performance-tracks", "partial-prerendering", "ssr", "cachesignal"]
difficulty: "hard"
asked_as: ["What are React Performance Tracks?", "What is partial pre-rendering?", "What is an owner stack?", "What is cacheSignal?"]
---

## Short answer

React 19.1 added **owner stacks**, which show which components *rendered* the component with the error, not just its parent elements (`captureOwnerStack()` reads one in development). React 19.2 added **Performance Tracks** in Chrome DevTools, which show React's scheduler and component work in the Performance panel. It also added **partial pre-rendering** (pre-render a static shell, then resume and fill in the dynamic parts), **batched Suspense reveals** during streaming SSR, Web Streams support in Node, and **`cacheSignal`** for Server Components. React 19.3 then made **transitions render independently**, so one slow transition no longer holds back unrelated ones.

## Explanation

### Owner stacks (19.1)

A normal component stack shows the parent chain in the tree: `List > Layout > App`. An **owner stack** shows who *created* the element, which is usually the component you actually need to fix. React DevTools and error overlays use it. `captureOwnerStack()` from `react` returns it in development, which is useful in custom error logging.

### Performance Tracks (19.2)

In Chrome DevTools' **Performance** panel, React adds its own tracks:

| Track | Shows |
| --- | --- |
| Scheduler | Work by priority: blocking (urgent) vs transition, and when React waited or yielded |
| Components | Which components rendered and how long their effects took |

This makes it much easier to answer "why did this click feel slow?" than reading a flame chart alone.

### Partial pre-rendering (19.2)

The static parts of a page (header, layout) can be pre-rendered at build time and served from a CDN, while the dynamic parts are filled in per request:

```text
 build time:  prerender()  -> static shell HTML + "postponed" state  -> CDN
 request:     resume(postponed) -> streams the dynamic parts into the shell
```

The APIs live in `react-dom/static` (`prerender`) and `react-dom/server` (`resume`). Frameworks such as Next.js build on them.

### Other 19.2 changes

- **Batched Suspense reveals in SSR:** boundaries that resolve close together are shown together, which avoids "popcorn" loading and pairs with view transitions.
- **Web Streams in Node:** `renderToReadableStream` and related APIs are available in Node.
- **`cacheSignal()`:** in Server Components, an `AbortSignal` that fires when a `cache()` lifetime ends, so you can cancel fetches that are no longer needed.
- **`useId` prefix changed** to a format that is valid in CSS selectors and view-transition names.

## Example

```jsx
// main.jsx (client): owner stack in custom error logging (dev only)
import { captureOwnerStack } from "react";
import { createRoot } from "react-dom/client";

createRoot(rootEl, {
  onCaughtError(error, info) {
    reportError({
      error,
      componentStack: info.componentStack,
      ownerStack: process.env.NODE_ENV !== "production" ? captureOwnerStack() : null,
    });
  },
});
```

```jsx
// lib/data.js (Server Components): stop fetching once the render is done
import { cache, cacheSignal } from "react";

const getUser = cache((id) =>
  fetch(`https://api.example.com/users/${id}`, { signal: cacheSignal() })
);
```

## Common mistakes

- Relying on `captureOwnerStack()` in production. It only returns a stack in development.
- Profiling the development build. Its timings include dev-only checks; use a production profiling build for real numbers.
- Expecting partial pre-rendering in a plain client-side app. It needs a server or framework that runs `prerender` and `resume`.
- Treating `cacheSignal` as a client feature. It is for Server Components.

## Follow-up questions

- **How would you debug a slow interaction today?** Record it in the Performance panel, check the React Scheduler track for blocking work, then the Components track for what rendered and how long it took.
- **Partial pre-rendering vs SSG vs SSR?** SSG pre-renders the whole page; SSR renders it all per request; partial pre-rendering serves a static shell instantly and streams in the dynamic parts.
- **What does "independent transitions" in 19.3 mean?** Separate transitions are no longer combined into one render, so a slow one doesn't delay an unrelated fast one.

## Quick recap

- 19.1: owner stacks for clearer error locations.
- 19.2: Performance Tracks, partial pre-rendering, batched SSR reveals, `cacheSignal`.
- 19.3: transitions render independently.
- These matter most for debugging performance and for framework-level SSR.
