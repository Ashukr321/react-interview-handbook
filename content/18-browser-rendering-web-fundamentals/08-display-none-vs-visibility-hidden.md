---
title: "Difference between display: none and visibility: hidden"
tags: ["css", "rendering", "layout", "accessibility"]
difficulty: "easy"
---

## Short answer

`display: none` removes the element from the render tree entirely: it takes up no space, causes surrounding content to reflow, and is hidden from screen readers. `visibility: hidden` keeps the element in the layout, so its space is still reserved, but it is not painted and cannot be clicked or focused; it is also hidden from screen readers. `opacity: 0` is a third option that keeps both the space and the interactivity.

## Explanation

Imagine a seat at a dinner table. `display: none` takes the chair away, and everyone shifts over. `visibility: hidden` leaves an empty chair; nobody moves, but you cannot see anyone there. `opacity: 0` is an invisible person sitting in the chair, who can still be bumped into (clicked).

### Comparison

| | `display: none` | `visibility: hidden` | `opacity: 0` |
|---|---|---|---|
| Takes up space | No | Yes | Yes |
| In render tree | No | Yes | Yes |
| Painted | No | No | Yes (transparent) |
| Clickable / focusable | No | No | Yes |
| Screen readers | Hidden | Hidden | Still read |
| Children can override | No | Yes (`visibility: visible` on a child) | No |
| Animatable with CSS transitions | No (newer `transition-behavior: allow-discrete` helps) | Yes (discrete) | Yes (smooth) |
| Toggling cost | Layout (reflow) + paint | Paint only | Composite only |

### Related options

- **Conditional rendering in React** (`{open && <Modal />}`): the element is not in the DOM at all, and its state resets when it unmounts.
- **`hidden` attribute**: like `display: none` by default.
- **Visually hidden / `sr-only` class**: hidden visually but still read by screen readers, used for accessible labels.
- **`content-visibility: auto`**: skips rendering of off-screen content while keeping it in the DOM, for performance.

### Which to use

- Tabs or accordions where state must survive: `display: none` (or the `hidden` attribute).
- Keeping layout stable while hiding something (avoiding layout shift): `visibility: hidden`.
- Fade animations: `opacity` plus `visibility` so the hidden element is not clickable.
- Not needed at all: conditional rendering.

## Example

```jsx
import { useState } from "react";

export function HideDemo() {
  const [hidden, setHidden] = useState(false);

  return (
    <div>
      <button onClick={() => setHidden((h) => !h)}>Toggle</button>

      {/* removed from layout, keeps component state */}
      <div style={{ display: hidden ? "none" : "block" }}>display</div>

      {/* space stays reserved */}
      <div style={{ visibility: hidden ? "hidden" : "visible" }}>visibility</div>

      {/* fade: opacity animates, visibility makes it unclickable when hidden */}
      <div
        style={{
          opacity: hidden ? 0 : 1,
          visibility: hidden ? "hidden" : "visible",
          transition: "opacity 200ms, visibility 200ms",
        }}
      >
        fade
      </div>

      {/* unmounted: state is lost */}
      {!hidden && <p>conditional</p>}
    </div>
  );
}
```

## Common mistakes

- Using `opacity: 0` to hide content, leaving invisible buttons that can still be clicked and read by screen readers.
- Trying to transition `display`; the change is instant in most setups.
- Assuming `visibility: hidden` content is accessible; it is hidden from assistive technology too.
- Unmounting a form with conditional rendering when the user expects their input to be preserved.

## Follow-up questions

- **How do you hide something only visually but keep it for screen readers?** Use a visually-hidden utility (clip, 1px size, `position: absolute`), such as Tailwind's `sr-only`.
- **Does `display: none` stop images from loading?** An `<img>` inside it usually still downloads; CSS background images on hidden elements typically do not.
- **Which triggers reflow?** Toggling `display` changes layout; `visibility` only repaints; `opacity` can be composited on the GPU.

## Quick recap

- `display: none`: no space, no render, no interaction.
- `visibility: hidden`: space kept, not painted, no interaction.
- `opacity: 0`: space kept, still interactive and read aloud.
- Conditional rendering removes it from the DOM and resets state.
