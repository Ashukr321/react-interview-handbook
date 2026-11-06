---
title: "How does Suspense improve UX?"
tags: ["suspense", "ux", "loading-states", "streaming"]
difficulty: "medium"
---

## Short answer

Suspense lets you declare **where** loading states appear instead of sprinkling `isLoading` checks in every component. That gives you coordinated, intentional loading UI (skeletons in the right places, no spinner soup), lets parts of the page appear independently, and, combined with transitions, keeps existing content visible instead of flashing back to spinners. On the server it enables streaming HTML and selective hydration, so users see and interact with content sooner.

## Explanation

Analogy: a theatre curtain. Without Suspense, every actor walks on stage whenever they're ready, half-dressed. With Suspense, you decide which sections of the stage reveal together, and the curtain only lifts on a section when it's ready.

### UX benefits

| Without Suspense | With Suspense |
|---|---|
| Each component shows its own spinner (spinner soup) | One skeleton per meaningful region |
| Layout jumps as pieces pop in randomly | Regions reveal in planned groups |
| Fetch-on-render waterfalls hidden in effects | Data can be started early and read with `use` |
| Whole page waits for the slowest API on SSR | Shell streams immediately; slow parts stream later |
| Page isn't interactive until all JS hydrates | Selective hydration; clicked regions hydrate first |
| Navigation shows blank page while loading | With transitions, old page stays visible |

### Design guidance

- Place boundaries around **meaningful units** (a sidebar, a comments section), not every tiny component.
- Use skeletons that match the final layout to avoid cumulative layout shift (CLS).
- Wrap navigations in transitions so already revealed content doesn't get hidden.
- React throttles revealing of nested boundaries slightly so content doesn't pop in too frequently.

## Example

```jsx
import { Suspense, lazy } from "react";

const Comments = lazy(() => import("./Comments"));

export default function ArticlePage({ articlePromise }) {
  return (
    <Layout>
      {/* Main content: one boundary for title + body */}
      <Suspense fallback={<ArticleSkeleton />}>
        <Article articlePromise={articlePromise} />
      </Suspense>

      {/* Secondary content loads independently */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>
    </Layout>
  );
}
```

```jsx
import { use } from "react";

function Article({ articlePromise }) {
  const article = use(articlePromise); // suspends until resolved (React 19)
  return (
    <article>
      <h2>{article.title}</h2>
      <p>{article.body}</p>
    </article>
  );
}
```

## Common mistakes

- Wrapping every small component in its own boundary, recreating spinner soup.
- Putting a single boundary at the root, so the whole app blanks while any data loads.
- Creating the promise inside the component on every render with `use(fetch(...))`, which re-suspends forever. Promises must be cached or come from a framework/library.
- Forgetting transitions, so navigations replace visible content with fallbacks.

## Follow-up questions

- **Does Suspense fetch data?** No. It coordinates loading UI; a framework, library (TanStack Query, Relay, SWR) or `use` with a cached promise provides the suspending data.
- **How does Suspense help SEO?** With streaming SSR the HTML (including content that resolves later in the stream) is still delivered in the same response.
- **What about errors?** Pair Suspense boundaries with error boundaries so a failed region shows an error UI instead of breaking the page.

## Quick recap

- Declarative, placed loading states.
- Regions reveal independently and intentionally.
- Transitions prevent re-showing fallbacks.
- Enables streaming SSR and selective hydration.
- Keep boundaries meaningful, not everywhere.
