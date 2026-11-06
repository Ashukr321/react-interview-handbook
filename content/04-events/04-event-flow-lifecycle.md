---
title: "Explain the event flow lifecycle"
tags: ["events", "dom", "propagation", "rendering"]
difficulty: "medium"
---

## Short answer

A DOM event travels in three phases: **capture** (from `window` down to the target's parent), **target** (at the element itself), and **bubble** (back up to `window`). In React, the root container listens in both phases, runs your `onXCapture` handlers on the way down and `onX` handlers on the way up, then the batched state updates trigger **render, commit and effects**.

## Explanation

Think of a letter delivered to an apartment: it goes from the city post office down to the building and then to the flat (capture), is opened (target), then the reply travels back up the same route (bubble). Anyone along the route can read it or stop it.

### Full lifecycle, from click to screen

```text
1. Browser creates native event (e.g. click)
          |
2. CAPTURE phase:  window -> document -> #root -> div -> button
          |        #root capture listener: React runs onClickCapture
          |        handlers along the fiber path, top-down
          |
3. TARGET phase:   native listeners on <button> itself
          |
4. BUBBLE phase:   button -> div -> #root -> document -> window
          |        #root bubble listener: React runs onClick
          |        handlers along the fiber path, bottom-up
          |
5. Default action  (submit form, follow link) unless preventDefault()
          |
6. React processes batched setState calls (lane = event priority)
          |
7. Render phase  -> diff, no DOM changes
8. Commit phase  -> DOM updated, refs set, useLayoutEffect runs
9. Browser paints
10. useEffect callbacks run
```

### Stopping the flow

| Call | Effect |
|---|---|
| `e.stopPropagation()` | Later handlers in the propagation path do not run |
| `e.preventDefault()` | Default browser action is cancelled; propagation continues |
| `e.nativeEvent.stopImmediatePropagation()` | Stops other native listeners on the same node (rarely needed) |

### Interop gotcha

React's handlers run when the native event reaches the **root**. So a native listener attached directly to an inner element (via `addEventListener`) runs **before** React's `onClick` in the bubble phase. If that native listener calls `stopPropagation()`, React's `onClick` never fires.

## Example

```jsx
import { useEffect, useRef } from "react";

export default function FlowDemo() {
  const btnRef = useRef(null);

  useEffect(() => {
    const btn = btnRef.current;
    const native = () => console.log("3. native listener on button");
    btn.addEventListener("click", native);
    return () => btn.removeEventListener("click", native);
  }, []);

  return (
    <div
      onClickCapture={() => console.log("1. div capture (React)")}
      onClick={() => console.log("5. div bubble (React)")}
    >
      <button
        ref={btnRef}
        onClickCapture={() => console.log("2. button capture (React)")}
        onClick={() => console.log("4. button bubble (React)")}
      >
        Click
      </button>
    </div>
  );
}
// Logs 1, 2, 3, 4, 5
```

## Common mistakes

- Thinking events start at the target and only bubble; capture always happens first.
- Assuming `preventDefault()` stops propagation, or `stopPropagation()` prevents the default action. They are independent.
- Expecting state to be updated immediately after `setState` inside the handler; it is applied in the render after the handler.

## Follow-up questions

- **When would you use a capture handler?** To intercept an event before children see it, e.g. closing a menu on any outside click or logging analytics.
- **Do all events go through all phases?** Non-bubbling events (like `focus`) have capture and target phases but no bubble phase.
- **When does `useEffect` run relative to the click?** After the commit and usually after the browser paints; for discrete events like clicks, React may flush effects earlier to keep results consistent.

## Quick recap

- Capture down, target, bubble up.
- React runs capture handlers at the root on the way down, bubble handlers at the root on the way up.
- Then batched updates -> render -> commit -> paint -> effects.
- Native listeners on inner nodes run before React bubble handlers.
