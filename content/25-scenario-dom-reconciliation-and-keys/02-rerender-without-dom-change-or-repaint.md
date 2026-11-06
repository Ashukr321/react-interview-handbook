---
title: "A component re-renders, but the browser doesn't repaint. Why?"
asked_as: ["Why can React re-render without changing the Real DOM?"]
tags: ["reconciliation", "render-vs-commit", "virtual-dom", "paint"]
difficulty: "medium"
---

## Short answer

A React "render" only means calling your component and producing a new element tree in memory. React then diffs that tree against the current Fiber tree, and if the output is the same, the commit phase has **no DOM mutations to apply**. With no DOM or style change, the browser has nothing new to lay out or paint. Re-rendering is a JavaScript cost; repainting happens only when the real DOM or CSS actually changes.

## Why it happens

Think of an editor proofreading a page. Reading it again (render) doesn't mean the printer reprints it (paint). Only an actual correction (DOM change) sends anything to the printer.

```text
setState ─► Render phase ─► Reconciliation (diff) ─► Commit phase ─► Browser
            call components   compare old vs new       apply diffs     style → layout → paint
                                    │
                                    └─ no differences → commit does nothing → no paint
```

Typical reasons the output is identical:

- The parent re-rendered and passed the same values down.
- State changed, but the rendered output didn't (e.g. a hover counter that isn't displayed).
- A context value changed in a field this component doesn't render.
- Strict Mode double-invoked render in development.
- React rendered once more to confirm a same-value bail-out.

Even when the DOM *does* change, a repaint may be skipped or minimal:

- The change is to an off-screen, `display: none`, or `content-visibility: auto` region.
- Several changes are batched into one frame: the browser paints once per frame, not once per mutation.
- Only compositor properties changed (`transform`, `opacity`), so the browser composites without repainting.

## How to fix it

Usually there's nothing to fix. This is React working as designed. Act only if the *render* cost is measurable:

1. Find who triggered the render (Profiler → "Why did this render?").
2. Move state closer to where it's used, or skip the subtree with `memo` / the React Compiler.
3. Avoid state that doesn't affect output; use a `ref` for values like timers or previous positions.

```jsx
import { useRef, useState } from "react";

export default function Tracker() {
  // ❌ triggers a render on every mouse move, but the output never uses it
  // const [lastX, setLastX] = useState(0);

  // ✅ no render at all
  const lastX = useRef(0);
  const [clicks, setClicks] = useState(0);

  return (
    <div
      onMouseMove={(e) => { lastX.current = e.clientX; }}
      onClick={() => setClicks((c) => c + 1)}
    >
      Clicks: {clicks}
    </div>
  );
}
```

## How to verify

- React DevTools highlight shows the component rendered.
- Chrome DevTools → Rendering → **Paint flashing** shows no green flash.
- The Elements panel shows no flashing nodes, and a `MutationObserver` logs nothing.
- The Performance panel shows scripting time but no new Paint entry for that interaction.

## Follow-up questions

- **Is the virtual DOM diff what makes this possible?** Yes. React compares element trees (via Fiber) and commits only differences.
- **Does an unnecessary render ever matter?** When it's frequent or the subtree is large, scripting time can block input (poor INP) even with zero paint.
- **Does setting the same `textContent` repaint?** React skips it, because it compares props before writing to the DOM.

## Quick recap

- Render = run components; commit = mutate the DOM; paint = browser draws.
- Identical output → empty commit → nothing to paint.
- Browsers paint per frame and can skip invisible changes.
- Optimize renders only when the Profiler shows real cost.
