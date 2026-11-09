---
title: "What is a passive event listener?"
tags: ["events", "performance", "scroll", "dom"]
difficulty: "medium"
---

## Short answer

A passive listener is registered with `{ passive: true }` and **promises the browser it will never call `preventDefault()`**. Because the browser no longer has to wait for the handler to decide whether to cancel scrolling, it can scroll immediately on the compositor thread, which removes scroll jank on touch and wheel events. React registers `touchstart`, `touchmove` and `wheel` as passive at the root, so calling `e.preventDefault()` in `onWheel`/`onTouchMove` does not work; use a native non-passive listener for that.

## Explanation

Imagine a security guard at a door who might stop you. Everyone has to pause until he decides. A passive listener is a guard who has promised never to stop anyone, so people walk straight through while he takes notes.

### Why it matters

For `touchstart`, `touchmove` and `wheel`, the default action is scrolling. If any listener might call `preventDefault()`, the browser must run JavaScript before it scrolls. A slow handler means a frozen-feeling scroll.

```text
Non-passive:  touch -> run JS handler (maybe 50ms) -> decide -> scroll
Passive:      touch -> scroll immediately
                    -> run JS handler in parallel (cannot cancel)
```

### Browser and React defaults

| Context | Default |
|---|---|
| `addEventListener` on most elements | `passive: false` |
| `touchstart`/`touchmove`/`wheel`/`mousewheel` on `window`, `document`, `body` (Chrome, Firefox, Safari) | `passive: true` |
| React `onTouchStart`, `onTouchMove`, `onWheel` | Passive (registered that way at the root) |

If a passive listener calls `preventDefault()`, the browser ignores it and logs a console warning.

### When you need non-passive

Custom pinch-zoom, canvas drawing, map panning, carousels that lock vertical scroll. Attach a native listener with `{ passive: false }` in an effect. Prefer CSS where possible: `touch-action: none` or `touch-action: pan-y` tells the browser what to allow without any JavaScript.

## Example

```jsx
import { useEffect, useRef, useState } from "react";

export default function ZoomCanvas() {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    const onWheel = (e) => {
      e.preventDefault(); // allowed: non-passive
      setScale((s) => Math.min(4, Math.max(0.5, s - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onScroll = () => console.log(window.scrollY); // read-only: passive
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} style={{ height: 300, overflow: "hidden", touchAction: "none" }}>
      <div style={{ transform: `scale(${scale})` }}>Zoom me</div>
    </div>
  );
}
```

## Common mistakes

- Calling `e.preventDefault()` in React's `onWheel` or `onTouchMove` and wondering why the page still scrolls.
- Marking every listener non-passive "just in case", which brings jank back.
- Forgetting cleanup for native listeners added in effects.
- Using JavaScript to block scrolling where `touch-action` or `overscroll-behavior` CSS would do.

## Follow-up questions

- **Is `scroll` itself cancelable?** No. The `scroll` event fires after scrolling happened, so passive does not change much for it; it matters for `wheel` and touch events that cause scrolling.
- **How do you check support?** All modern browsers support the options object; feature detection was only needed for very old browsers.

## Quick recap

- Passive = promise not to call `preventDefault()`.
- Lets the browser scroll without waiting for JS.
- React's touch and wheel handlers are passive.
- Need to cancel? Native listener with `{ passive: false }`, or CSS `touch-action`.
