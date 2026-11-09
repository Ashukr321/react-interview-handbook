---
title: "How does nested Suspense work?"
tags: ["suspense", "nesting", "progressive-loading", "internals"]
difficulty: "medium"
---

## Short answer

When boundaries are nested, a suspension goes to the **innermost** boundary that wraps the suspending component. The outer boundary waits only for content that isn't covered by an inner boundary. This gives progressive reveal: first the outer shell appears with the inner fallbacks in place, then each inner region fills in as its data arrives. An inner region can never appear before its outer boundary has revealed.

## Explanation

Analogy: Russian dolls, or a house being built. The outer structure (walls and roof) must be up before rooms can be furnished; each room is then furnished on its own schedule.

### Reveal sequence

```text
<Suspense fallback=PageSpinner>        (outer)
  <Article/>                           needs article data
  <Suspense fallback=CommentsSkeleton> (inner)
    <Comments/>                        needs comments data
  </Suspense>
</Suspense>

t=0     PageSpinner (Article pending)
t=300   Article + CommentsSkeleton     (outer resolved, inner still pending)
t=900   Article + Comments             (inner resolved)

If comments arrive first (t=100): still PageSpinner until t=300,
then Article and Comments appear together.
```

### Rules

| Rule | Consequence |
|---|---|
| Innermost boundary catches | Inner suspensions don't affect the outer region |
| Outer must reveal first | Inner content can't show while outer is on its fallback |
| Outer waits for its direct content | Components not wrapped by an inner boundary hold the outer back |
| Fallbacks are part of the parent | An inner fallback is shown as normal content of the outer boundary |
| Reveal throttling | React batches nested reveals that happen close together (about 300 ms) to reduce flicker |

### Designing nested boundaries

- Outer boundary: essential content (title, main body) that defines the page.
- Inner boundaries: secondary, slower content (comments, recommendations, related items).
- Matches streaming SSR well: the shell and article stream first, comments stream later.

## Example

```jsx
import { Suspense } from "react";

export default function PostPage({ postPromise, commentsPromise, relatedPromise }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Post postPromise={postPromise} />

      <Suspense fallback={<CommentsSkeleton />}>
        <Comments commentsPromise={commentsPromise} />

        <Suspense fallback={<p>Loading related posts...</p>}>
          <Related relatedPromise={relatedPromise} />
        </Suspense>
      </Suspense>
    </Suspense>
  );
}
```

Here `Related` can only appear after `Comments`, and `Comments` only after `Post`. If you want `Related` independent of `Comments`, make them siblings rather than nesting one inside the other.

## Common mistakes

- Nesting when you meant siblings, which unintentionally ties reveal order to the parent.
- Leaving a slow component directly in the outer boundary, holding the whole page on the spinner.
- Deep nesting with tiny regions, causing a staircase of skeletons.
- Assuming an inner region that resolved first will appear first. It waits for the outer.

## Follow-up questions

- **How does nesting interact with transitions?** If an update inside a transition suspends in a newly mounted inner boundary, that inner fallback shows (it's new), while already revealed outer content stays.
- **How is this used in Next.js?** Nested `loading.js` files in route segments create nested boundaries automatically.
- **Does nesting cause request waterfalls?** Not by itself; waterfalls come from starting fetches inside components that only render after the parent resolves.

## Quick recap

- Innermost boundary catches the suspension.
- Outer reveals before inner, never the reverse.
- Outer waits only for uncovered content.
- Use nesting for primary vs secondary content.
- Siblings, not nesting, for independent regions.
