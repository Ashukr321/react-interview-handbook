---
title: "How can Suspense improve the perceived loading experience?"
tags: ["suspense", "ux", "skeletons", "streaming", "transitions"]
difficulty: "medium"
---

## Short answer

Suspense lets you show **meaningful structure early and reveal content progressively** instead of a blank screen or a single spinner. Users see the layout and skeletons immediately, important content first, and the rest streaming in. Combined with transitions, Suspense also keeps already-visible content on screen during updates instead of flashing back to loading states, and with streaming SSR the first paint arrives before the slowest data is ready.

## Why it happens

Perceived speed depends on *when something useful appears* and *how stable it feels*, not just on total load time.

```text
Spinner page:     [■■■■■■■■ blank/spinner 2.5s ■■■■■■■■] → everything at once
Suspense design:  shell 100ms → hero 300ms → list 800ms → recommendations 2.5s
                  same total time, but useful content at 300ms
```

### Techniques Suspense enables

| Technique | Effect on perception |
| --- | --- |
| Layout-matching skeleton fallbacks | Page feels "already there"; no layout shift |
| Nested boundaries (outer = page, inner = details) | Progressive reveal from coarse to fine |
| Streaming SSR | HTML shell and early content paint before slow data |
| Transitions (`startTransition`, router navigations) | Old screen stays visible with a pending hint instead of a skeleton flash |
| Grouping related parts in one boundary | Avoids "popcorn" UI where pieces pop in randomly |
| `lazy()` + prefetch on hover | Code arrives before the click, so the fallback rarely shows |

React itself helps too: it shows fallbacks immediately on first load, briefly throttles successive reveals so nearby boundaries appear together, and in React 19 commits a fallback right away and then pre-renders suspended siblings in the background.

## How to fix it

```jsx
import { Suspense, useTransition } from "react";

export default function ArticlePage({ id }) {
  return (
    <Layout>
      <Suspense fallback={<ArticleSkeleton />}>
        <Article id={id} />               {/* main content first */}
        <Suspense fallback={<CommentsSkeleton count={3} />}>
          <Comments articleId={id} />      {/* secondary, reveals later */}
        </Suspense>
      </Suspense>
    </Layout>
  );
}

function Pager({ onPage }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => onPage((p) => p + 1))} // keep current page visible
    >
      {isPending ? "Loading…" : "Next page"}
    </button>
  );
}
```

Design checklist:

1. Skeletons match the final layout, so there's no CLS.
2. The most important content gets the outermost, fastest boundary.
3. Updates to visible content go through transitions, so there are no skeleton flashes.
4. Prefetch data and code for likely next actions.

> **⚠️ Gotcha:** A spinner fallback around the whole app throws all of this away. Users get a blank page until the slowest request resolves.

## How to verify

- Lighthouse / Web Vitals: FCP and LCP improve, and CLS stays near 0.
- Record a filmstrip in the Performance panel: useful content appears in early frames.
- Navigate between pages: previous content stays with a pending indicator, with no flash to skeleton.

## Follow-up questions

- **Skeleton or spinner?** Skeletons for content areas (they preview structure); small inline spinners for actions.
- **Can loading feel *worse* with Suspense?** Yes, with too many tiny boundaries popping in, or skeletons that don't match the real content.
- **How does `useDeferredValue` fit in?** It shows stale results (optionally dimmed) while new ones load, instead of a fallback.

## Quick recap

- Show structure early, reveal content progressively.
- Layout-matching skeletons and nested boundaries.
- Streaming SSR gets the first paint before slow data.
- Transitions keep visible content from flashing back to loading.
