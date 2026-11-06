---
title: "What is event bubbling and event capturing?"
tags: ["events", "dom", "bubbling", "capturing"]
difficulty: "easy"
---

## Short answer

They are the two directions an event travels through the DOM. **Capturing** goes from the outermost ancestor (`window`) down to the target; **bubbling** goes from the target back up to `window`. By default listeners run in the bubble phase. In the DOM you opt into capture with `addEventListener(type, fn, { capture: true })`; in React you use the `Capture` suffix, e.g. `onClickCapture`.

## Explanation

Picture dropping a stone into a well (capture: it falls through every layer to the bottom) and then a bubble rising back up through the same layers (bubble). Listeners can sit at any layer and choose which direction to listen to.

```text
          window
            |  ^
        document |
            |  |
          <div>  |       capture  = top -> down  (onClickCapture)
            |  |       bubble   = bottom -> up (onClick)
         <button>  <- target
```

### Comparison

| | Capturing | Bubbling |
|---|---|---|
| Direction | Ancestor -> target | Target -> ancestor |
| Default? | No, opt in | Yes |
| DOM API | `addEventListener(t, fn, true)` | `addEventListener(t, fn)` |
| React prop | `onClickCapture` | `onClick` |
| Typical use | Intercept early, outside-click logic, analytics | Normal handlers, delegation |

### Stopping it

`event.stopPropagation()` stops the event at the current element, in whichever phase. If called during capture on an ancestor, the target never receives it.

### Events that don't bubble

`focus`, `blur`, `mouseenter`, `mouseleave`, `load`, and `scroll` on elements. React's `onFocus`/`onBlur` do bubble because React uses `focusin`/`focusout`; React's `onScroll` does not bubble (since React 17).

## Example

```jsx
export default function Phases() {
  const log = (msg) => () => console.log(msg);

  return (
    <div onClickCapture={log("outer capture")} onClick={log("outer bubble")}>
      <section onClickCapture={log("inner capture")} onClick={log("inner bubble")}>
        <button onClick={log("button")}>Click</button>
      </section>
    </div>
  );
}
// Clicking the button logs:
// outer capture -> inner capture -> button -> inner bubble -> outer bubble
```

Stopping during capture:

```jsx
function Guard({ disabled, children }) {
  return (
    <div
      onClickCapture={(e) => {
        if (disabled) e.stopPropagation(); // children never get the click
      }}
    >
      {children}
    </div>
  );
}
```

## Common mistakes

- Using `stopPropagation()` liberally; it breaks delegation, analytics and outside-click detection elsewhere.
- Assuming `onMouseEnter` bubbles like `onMouseOver`. It does not.
- Forgetting the third `addEventListener` argument when removing a capture listener; `removeEventListener` must match the same `capture` flag.

## Follow-up questions

- **What is the target phase?** The moment the event is at the target itself; listeners there run in registration order (capture listeners first in modern browsers).
- **How do you detect a click outside a dropdown?** Listen on `document` (often in capture phase) and check `!ref.current.contains(e.target)`.
- **Does React's `stopPropagation()` stop native listeners?** It stops native propagation from the root upward (e.g. `document` listeners), but native listeners on inner elements already ran.

## Quick recap

- Capture: top-down; bubble: bottom-up; bubble is default.
- React: `onClickCapture` vs `onClick`.
- `stopPropagation()` stops the journey in either phase.
- Some events don't bubble; know the alternatives.
