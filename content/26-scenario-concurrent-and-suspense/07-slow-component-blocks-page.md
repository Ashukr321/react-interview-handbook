---
title: "One slow component blocks the entire page. How would Suspense help?"
tags: ["suspense", "streaming-ssr", "selective-hydration", "performance"]
difficulty: "medium"
---

## Short answer

Wrap the slow component in its own `<Suspense>` boundary. React then renders and shows everything else immediately, displays a fallback only where the slow part goes, and swaps the real content in when it's ready. With streaming SSR, the server sends the page shell without waiting for the slow component, and **selective hydration** makes the rest interactive before that component's code or data arrives.

## Why it happens

Without a boundary close to it, a suspending component bubbles up to the **nearest ancestor boundary**, often one around the whole route or app, so the whole page shows a spinner. In SSR without streaming, the server can't send *any* HTML until the slowest data is fetched.

```text
Without a local boundary:
  Server: wait for Reviews API (3s) ──────────► send full HTML
  Client: blank/spinner for 3s+

With <Suspense> around <Reviews>:
  Server: send shell + header + product + <ReviewsSkeleton> ─► (3s later) stream Reviews chunk
  Client: page visible and interactive almost immediately; Reviews pops in
```

## How to fix it

1. Identify the slow piece (slow API, heavy lazy-loaded bundle, or both).
2. Wrap it in a boundary with a skeleton that matches its size.
3. Make sure it doesn't block siblings: its data fetch shouldn't be awaited by the parent.
4. Add an Error Boundary so a failure stays local.

```jsx
// Next.js App Router: app/products/[id]/page.jsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id); // fast, needed for the main content

  return (
    <>
      <ProductDetails product={product} />
      <AddToCartButton id={id} /> {/* interactive right away */}

      <ErrorBoundary fallback={<p>Reviews are unavailable right now.</p>}>
        <Suspense fallback={<ReviewsSkeleton />}>
          <Reviews productId={id} /> {/* async server component, 3s API */}
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
```

For client-only apps the idea is the same: the slow widget reads from a Suspense-enabled source (`use()`, `useSuspenseQuery`) or is `lazy()`-loaded, and its boundary keeps the rest of the UI on screen.

> **💡 Interview tip:** Mention **selective hydration**. If the user clicks something inside a still-hydrating boundary, React prioritizes hydrating *that* boundary first.

> **⚠️ Gotcha:** If the slow component is just CPU-heavy (no data or code loading), Suspense doesn't help, because nothing suspends. Use transitions, memoization or a worker instead.

## How to verify

- Delay the slow API (or use the DevTools network throttle): the rest of the page renders, and only the skeleton waits.
- The Performance panel or Lighthouse show improved FCP/LCP; the streamed HTML arrives in chunks.
- Click buttons outside the slow section before it loads; they should work.

## Follow-up questions

- **What does the fallback cost?** It's rendered immediately; keep it light and layout-stable.
- **Can the slow part load after the rest is interactive?** Yes. That's the point of streaming plus selective hydration.
- **How is this different from `if (loading) return <Spinner />`?** Suspense coordinates loading declaratively across the tree, works with streaming SSR, and avoids per-component loading-flag spaghetti.

## Quick recap

- A suspension bubbles up to the nearest boundary; put one close to the slow part.
- The rest of the page renders, streams and hydrates without waiting.
- Pair it with an Error Boundary and a size-matched skeleton.
- Suspense handles waiting on data or code, not CPU-heavy rendering.
