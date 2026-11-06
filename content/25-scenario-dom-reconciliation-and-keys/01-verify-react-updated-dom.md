---
title: "How would you verify whether React actually updated the DOM?"
tags: ["devtools", "commit-phase", "dom", "debugging"]
difficulty: "medium"
---

## Short answer

Separate **renders** from **DOM mutations**. React DevTools tells you which components *rendered*. To see whether the real DOM changed, use the Chrome DevTools Elements panel (mutated nodes flash purple), the Rendering tab's "Paint flashing", or a `MutationObserver` that logs every change. If a component rendered but no node flashed and no mutation was recorded, React reconciled and found nothing to commit.

## Why it happens

React works in two phases, and only the second touches the DOM:

```text
Render phase (pure, can run many times)        Commit phase (once per update)
  call components → new element tree    ──►    apply only the diffs to the DOM
  diff against current Fiber tree               run layout effects, then effects
```

"Highlight updates when components render" in React DevTools flashes on *render*, not on commit. That's why developers often think React "repainted everything" when it actually changed zero nodes.

## How to fix it

Use the right tool for each question:

| Question | Tool |
| --- | --- |
| Which components rendered, and why? | React DevTools Profiler ("Why did this render?") |
| Which DOM nodes changed? | Chrome Elements panel (nodes and attributes flash on change) |
| What did the browser repaint? | DevTools → More tools → Rendering → **Paint flashing** |
| Exact list of mutations | `MutationObserver` |
| Did layout/paint cost time? | Performance panel (Layout, Paint, Composite entries) |

A small debugging hook:

```jsx
import { useEffect, useRef } from "react";

export function useDomMutationLog(label) {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) =>
        console.log(`[${label}]`, m.type, m.target, m.attributeName ?? "")
      );
    });
    observer.observe(ref.current, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [label]);

  return ref;
}

// Usage
function PriceList({ items }) {
  const ref = useDomMutationLog("PriceList");
  return <ul ref={ref}>{items.map((i) => <li key={i.id}>{i.price}</li>)}</ul>;
}
```

If the list re-renders with the same prices, the observer logs nothing. Change one price and you'll see a single `characterData` mutation, which proves React patched one text node rather than rebuilding the list.

> **💡 Interview tip:** Mention that you'd check this in a **production build**. Development mode adds Strict Mode double renders, which inflate render counts but don't add DOM mutations.

## How to verify

- Elements panel: expand the subtree, trigger the update, and watch which nodes flash.
- Paint flashing: green rectangles show repainted regions; none means no paint.
- `MutationObserver`: there should be exactly the mutations you expect, no more.
- Compare against the Profiler: rendered components with no mutations means a wasted render, not a wasted DOM update.

## Follow-up questions

- **Can React update the DOM without a component re-rendering?** Not through React state. But refs and third-party libraries can mutate the DOM directly, outside React's knowledge.
- **Does a DOM mutation always cause a repaint?** No. Changes to invisible or off-screen elements, or ones that don't affect visuals, may not repaint.
- **Why is `useLayoutEffect` relevant here?** It runs after DOM mutations but before paint, so reading layout there reflects the committed DOM.

## Quick recap

- React DevTools shows renders, not DOM writes.
- Elements panel flashes and `MutationObserver` show actual DOM mutations.
- Paint flashing shows what the browser repainted.
- Rendered + no mutations = reconciliation found no diff.
