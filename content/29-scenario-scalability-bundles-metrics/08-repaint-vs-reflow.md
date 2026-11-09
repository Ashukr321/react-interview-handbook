---
title: "What is the difference between repaint and reflow?"
tags: ["rendering", "reflow", "repaint", "browser"]
difficulty: "medium"
---

## Short answer

Reflow (also called layout) is when the browser recalculates the size and position of elements, for example after changing width, font size or adding content. Repaint is when the browser redraws pixels for visual changes that do not affect layout, such as color or background. Reflow is more expensive because it can affect many elements and is always followed by a repaint; changes to `transform` and `opacity` can often skip both and happen only in compositing.

## Explanation

Think of rearranging furniture (reflow): you move a sofa and everything around it shifts. Repainting a wall (repaint) changes how the room looks without moving anything. Rearranging always means some touch-up painting afterwards.

### The rendering pipeline

```text
JavaScript -> Style -> Layout (reflow) -> Paint (repaint) -> Composite
                         |                   |                 |
                width, top, font      color, shadow,     transform,
                content changes       background         opacity
```

The later the stage your change starts at, the cheaper it is.

### Comparison

| | Reflow (layout) | Repaint (paint) |
| --- | --- | --- |
| What happens | Geometry recalculated | Pixels redrawn |
| Triggered by | `width`, `height`, `margin`, `padding`, `top`, `font-size`, adding/removing DOM, reading `offsetHeight` after a write | `color`, `background`, `visibility`, `box-shadow`, `outline` |
| Cost | High; can cascade to parents, children, siblings | Lower, but large or complex areas still cost |
| Followed by | Repaint + composite | Composite |

### Layout thrashing

Reading a layout property (`offsetHeight`, `getBoundingClientRect()`) right after writing styles forces the browser to reflow immediately (a forced synchronous layout). Doing it in a loop causes many reflows in one frame.

## Example

```js
// Bad: read/write interleaved -> reflow on every iteration
items.forEach((el) => {
  const h = el.offsetHeight;          // read (forces layout)
  el.style.height = `${h + 10}px`;    // write (invalidates layout)
});

// Good: batch reads, then batch writes
const heights = items.map((el) => el.offsetHeight);
requestAnimationFrame(() => {
  items.forEach((el, i) => { el.style.height = `${heights[i] + 10}px`; });
});
```

```css
/* Animating left triggers layout every frame */
.toast { transition: left 300ms; }

/* transform skips layout and paint: compositor only */
.toast { transition: transform 300ms; }
.toast.visible { transform: translateX(0); }
```

> **💡 Interview tip:** Link this to React: when you must measure DOM before paint (tooltips, popovers), use `useLayoutEffect` and do all reads before writes.

## Common mistakes

- Thinking `visibility: hidden` and `display: none` cost the same; `display: none` removes the element from layout and triggers reflow.
- Animating `width`/`top` instead of `transform`.
- Calling `getBoundingClientRect()` inside a scroll handler for many elements; use `IntersectionObserver`.
- Overusing `will-change`, which creates layers and uses GPU memory.

## Follow-up questions

- **How do you see reflows?** Chrome Performance panel shows purple "Layout" blocks and warns about forced reflow; the Rendering tab can flash repainted areas.
- **What is CSS containment?** `contain: layout paint` limits how far a change inside an element can affect the rest of the page.
- **Does React avoid reflows?** It batches DOM updates per commit, but your CSS and layout reads still decide the cost.

## Quick recap

- Reflow = recompute geometry; repaint = redraw pixels.
- Reflow is costlier and always triggers repaint.
- `transform` and `opacity` can skip both.
- Avoid layout thrashing by batching reads and writes.
