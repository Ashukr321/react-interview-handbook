---
title: "What is a Suspense boundary?"
tags: ["suspense", "boundaries", "architecture"]
difficulty: "easy"
---

## Short answer

A Suspense boundary is a `<Suspense fallback={...}>` element and the subtree it wraps. When any component inside that subtree suspends, the **nearest** boundary above it takes over and shows its fallback for that whole region. Boundaries define the units of your UI that load (and, with SSR, stream and hydrate) together.

## Explanation

Analogy: fire doors in a building. A fire (suspension) in one room is contained by the nearest fire door; the rest of the building carries on. Where you place the doors decides how much of the building is closed off.

### Properties of a boundary

- **Nearest wins**: a suspension bubbles up the fiber tree to the closest `Suspense` ancestor, like errors bubble to the closest error boundary.
- **All-or-nothing**: everything inside one boundary reveals together, even siblings that were already ready.
- **Isolation**: sibling boundaries load independently.
- **State preservation**: when an update re-suspends already shown content, the children are hidden, not unmounted.
- **SSR unit**: each boundary is a chunk that can be streamed and hydrated on its own.

### Choosing boundary placement

| Placement | Effect |
|---|---|
| One boundary at the app root | Whole app shows one spinner; simple but blunt |
| One per page section (header, feed, sidebar) | Good default: meaningful regions load independently |
| One per list item / tiny widget | Spinner soup and layout shift |
| Route level (`loading.js` in Next.js) | Framework creates a boundary per route segment |

Ask: "What should the user see together?" Group content that makes sense only as a unit in one boundary.

```text
<App>
 ├─ <Header/>                      (no suspense, always shown)
 ├─ <Suspense fallback=FeedSkeleton>
 │    ├─ <Feed/>        suspends -> FeedSkeleton shown
 │    └─ <FeedFilters/> ready, but hidden with Feed (same boundary)
 └─ <Suspense fallback=SidebarSkeleton>
      └─ <Sidebar/>     independent
```

## Example

```jsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export default function Home() {
  return (
    <Layout>
      <Header />
      <ErrorBoundary fallback={<p>Feed failed to load.</p>}>
        <Suspense fallback={<FeedSkeleton />}>
          <FeedFilters />
          <Feed />
        </Suspense>
      </ErrorBoundary>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </Layout>
  );
}
```

## Common mistakes

- No boundary above a suspending component. With no boundary at all, React 19 has nothing to show while waiting; on the client the root stays empty or unchanged, which looks like a frozen page.
- Too many boundaries, causing many skeletons popping in separately.
- Forgetting an error boundary next to it; rejections aren't handled by Suspense.
- Assuming portals escape the boundary. Suspensions bubble through the React tree, not the DOM tree, so a portal's content is still caught by its React ancestor's boundary.

## Follow-up questions

- **How is it similar to an error boundary?** Both catch something thrown during render and show alternative UI, using the nearest ancestor.
- **Can a fallback itself suspend?** It can, and it bubbles to the next boundary up, but avoid it; fallbacks should be cheap and synchronous.
- **Do boundaries affect performance?** They're cheap. The cost is UX: too few is blunt, too many is noisy.

## Quick recap

- Boundary = `Suspense` + subtree.
- Nearest boundary catches a suspension.
- Everything inside reveals together.
- Place around meaningful regions.
- Pair with error boundaries.
