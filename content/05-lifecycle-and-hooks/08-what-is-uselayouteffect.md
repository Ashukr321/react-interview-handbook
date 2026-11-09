---
title: "What is useLayoutEffect and why do we need it?"
asked_as: ["What is the useLayoutEffect hook?", "Why do we need useLayoutEffect?"]
tags: ["useLayoutEffect", "useEffect", "hooks", "rendering"]
difficulty: "medium"
---

## Short answer

`useLayoutEffect` has the same signature as `useEffect`, but it runs **synchronously after React updates the DOM and before the browser paints**. We need it when an effect must **read layout (size, position, scroll) and immediately change the DOM or state** based on it, so the user never sees an intermediate, wrong frame. Because it blocks painting, use it only for that; `useEffect` is the default.

## Explanation

Imagine hanging a picture. `useEffect` is like hanging it, letting guests in, and then straightening it while they watch. `useLayoutEffect` straightens it before the door opens.

```text
render (compute JSX)
   |
commit: React mutates the DOM
   |
useLayoutEffect runs  <- can measure DOM and setState; React re-renders
   |                     synchronously before paint
browser paints         <- user sees the final result once
   |
useEffect runs        <- after paint (usually); changes here cause a 2nd paint
```

### Comparison

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| Timing | After paint (usually) | After DOM mutation, before paint |
| Blocks paint | No | Yes |
| State updates inside | Visible as a second frame | Applied before the first paint |
| Use for | Fetching, subscriptions, logging, most effects | Measuring layout, tooltips/popovers positioning, scroll restoration, avoiding flicker |
| Runs on server | No | No |
| Class equivalent | `componentDidMount/DidUpdate` (async-ish) | `componentDidMount/DidUpdate` timing, `getSnapshotBeforeUpdate` patterns |

### Typical use cases

- Positioning a tooltip based on its measured size.
- Auto-sizing a textarea or truncating text after measuring.
- Restoring or anchoring scroll position after content changes.
- Animations that need the starting geometry (FLIP technique).

### Caveats

- Slow work inside it delays the frame; keep it tiny.
- It does not run during server rendering. For SSR, render a safe default and adjust on the client, or render the measured part only on the client.
- `useInsertionEffect` exists for CSS-in-JS libraries to inject styles even earlier; app code rarely needs it.

## Example

```jsx
import { useLayoutEffect, useRef, useState } from "react";

export default function Tooltip({ anchorRect, text }) {
  const ref = useRef(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const { height } = ref.current.getBoundingClientRect();
    // Not enough room above? Flip below the anchor.
    const above = anchorRect.top - height - 8;
    setTop(above >= 0 ? above : anchorRect.bottom + 8);
  }, [anchorRect, text]);

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ position: "fixed", top, left: anchorRect.left }}
    >
      {text}
    </div>
  );
}
// With useEffect, the tooltip would briefly paint at top: 0 and then jump.
```

## Common mistakes

- Using `useLayoutEffect` for data fetching or subscriptions, needlessly blocking paint.
- Doing heavy computation inside it, causing dropped frames.
- Expecting it to run on the server and measure anything during SSR.
- Reaching for it to fix every flicker when the real fix is computing values during render.

## Follow-up questions

- **Does `useEffect` always run after paint?** Usually, but if an update comes from a discrete user event (like a click), React may flush effects before paint so the result is consistent.
- **In what order do cleanups and setups run?** All layout effect cleanups, then all layout effect setups, during commit; passive effect cleanups and setups run later.
- **How do you avoid the SSR problem?** Render a placeholder on the server, or use a client-only boundary for the measured component.

## Quick recap

- Same API as `useEffect`, different timing.
- Runs after DOM updates, before paint, synchronously.
- Use it to measure layout and adjust without flicker.
- Default to `useEffect`; reach for layout effects only when you see a visual glitch.
