---
title: "Is Virtual DOM always faster?"
tags: ["virtual-dom", "performance", "misconceptions"]
difficulty: "medium"
---

## Short answer

No. The Virtual DOM adds work on top of the DOM update itself: creating elements, running components and diffing. Hand-written, targeted DOM updates are always at least as fast, and compile-time or signal-based frameworks (Svelte, Solid) often beat React in benchmarks. The Virtual DOM is "fast enough" for a declarative model and much faster than naive approaches like re-setting `innerHTML`, but it is not inherently faster than the real DOM.

## Explanation

### Where the cost comes from

```text
Direct update:   el.textContent = "5"                        (1 step)

React update:    setState -> schedule -> render component(s)
                 -> create elements -> reconcile -> commit
                 -> el.textContent = "5"                     (same final step + overhead)
```

The final DOM write is identical. Everything before it is overhead that buys you a declarative programming model.

### Comparison

| Approach | Typical speed | Developer cost |
|---|---|---|
| Re-render via `innerHTML` | Slow, loses DOM state | Low |
| Virtual DOM (React, Vue 2) | Good, with diffing overhead | Low |
| Hand-optimized imperative DOM | Fastest | High, bug-prone |
| Fine-grained signals (Solid, Preact Signals, Vue Vapor) | Very fast, updates exact nodes | Low-medium |
| Compiled updates (Svelte) | Very fast, no diff at runtime | Low |

Analogy: GPS navigation versus a local who knows the shortcut. The GPS (Virtual DOM) reliably gets you there without you thinking, but the local (hand-written code) is faster on routes they know.

### When the Virtual DOM is slow

- Large component trees re-rendered by a high-level state change.
- Very frequent updates (60 fps animations, real-time tickers) through state.
- Long lists without virtualization.
- Expensive calculations inside render without memoization.

### How React reduces the overhead

- Bailouts with `memo`, state colocation, and React Compiler auto-memoization.
- Batching many updates into one pass.
- Concurrent rendering to keep the UI responsive even when the work is large.
- Refs and direct DOM access (or animation libraries) for hot paths.

## Example

```jsx
import { useEffect, useRef } from "react";

// Hot path: updating 60 times per second through state would re-render each frame.
// Writing to the DOM via a ref skips React's render/diff entirely.
export default function FpsMeter() {
  const ref = useRef(null);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let id;
    const loop = (now) => {
      frames++;
      if (now - last >= 1000) {
        ref.current.textContent = `${frames} fps`;
        frames = 0;
        last = now;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  return <span ref={ref}>– fps</span>;
}
```

## Common mistakes

- Repeating the marketing line "Virtual DOM is faster than the real DOM". It's faster than naive full re-renders, not than targeted updates.
- Reaching for refs everywhere for "speed". Use them only for measured hot paths; you lose declarative guarantees.
- Assuming React performance problems are about the DOM. Usually they're about rendering too many components.

> **💡 Interview tip:** Quote the trade-off: "The Virtual DOM is a means to a declarative API with predictable performance, not a performance feature by itself."

## Follow-up questions

- **Why doesn't React switch to signals?** React values a simple "re-run the function" model and invests in React Compiler to remove most re-render overhead instead.
- **What's the memory cost?** React keeps two fiber trees plus element objects per render, which adds memory and GC pressure.
- **Is the Virtual DOM ever faster than hand-written code?** Only when the hand-written code is naive (e.g. rebuilding entire lists).

## Quick recap

- Virtual DOM adds overhead on top of DOM writes.
- Faster than naive re-rendering, slower than targeted updates.
- Signals/compilers can outperform it.
- Its value is a declarative model with good default performance.
