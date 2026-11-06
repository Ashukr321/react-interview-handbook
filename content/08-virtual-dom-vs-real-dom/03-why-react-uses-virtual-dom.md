---
title: "Why does React use a Virtual DOM?"
tags: ["virtual-dom", "declarative", "architecture"]
difficulty: "medium"
---

## Short answer

React uses a Virtual DOM so you can write **declarative** UI: you describe what the screen should look like for the current state, and React works out the minimal DOM changes. Re-creating cheap JS objects every render and diffing them is a practical way to make "re-render everything" fast enough. The same abstraction also lets React target other platforms and schedule work (Fiber, concurrent rendering) before touching the screen.

## Explanation

### The core problem

Imperative DOM code has to handle every transition by hand: "if item added, append; if removed, find and remove; if text changed, update text". As state grows, these transitions become a source of bugs.

React's model is `UI = f(state)`. Re-running `f` is easy, but blowing away and rebuilding the real DOM each time would be slow and would lose focus, scroll and input state. The Virtual DOM sits in between.

```text
state -> components -> new element tree (cheap)
                    -> diff with current tree
                    -> only real changes go to DOM (expensive part minimized)
```

### Benefits

| Benefit | Explanation |
|---|---|
| Declarative code | Describe the end state; no manual DOM bookkeeping |
| Good-enough performance by default | Batched, minimal DOM writes without hand-tuning |
| Preserves DOM state | Inputs, focus and scroll survive re-renders because nodes are reused |
| Platform independence | Same reconciler drives DOM, native views, canvas, terminals |
| Scheduling | Work can be computed, prioritized and interrupted before commit |
| Server rendering | Elements can be serialized to HTML or the RSC payload without a browser |

Analogy: a spreadsheet. You change one input cell and the sheet figures out which dependent cells to update. You don't redraw the whole sheet by hand.

### What it is not

It's not mainly a speed hack over well-written manual DOM code. Pete Hunt's original pitch was that the Virtual DOM makes a simple programming model fast enough, not faster than optimal hand-written updates.

## Example

```jsx
import { useState } from "react";

export default function Cart() {
  const [items, setItems] = useState([{ id: 1, name: "Book", qty: 1 }]);

  const inc = (id) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));

  // We describe the whole list every render.
  // React updates just the one text node whose qty changed.
  return (
    <ul>
      {items.map((i) => (
        <li key={i.id}>
          {i.name} × {i.qty} <button onClick={() => inc(i.id)}>+</button>
        </li>
      ))}
    </ul>
  );
}
```

## Common mistakes

- Answering "because the Virtual DOM is faster than the real DOM". The real reason is a declarative model with acceptable performance.
- Ignoring the cost: diffing is extra CPU work, which is why `memo` and the React Compiler exist.
- Assuming every framework needs a Virtual DOM. Svelte and Solid achieve declarative UI with compile-time or signal-based updates instead.

> **💡 Interview tip:** Lead with "declarative programming model", then mention batching, cross-platform rendering, and Fiber scheduling as bonuses.

## Follow-up questions

- **Does React re-render the whole app on every change?** No, only from the component whose state changed downward, minus bailouts.
- **Is the Virtual DOM required for React Server Components?** RSC sends a serialized element tree (the RSC payload), which the client reconciles like any other elements.
- **What does React Compiler change?** It auto-memoizes, so fewer elements are recreated and diffed.

## Quick recap

- Enables declarative `UI = f(state)`.
- Diffing cheap objects minimizes expensive DOM work.
- Preserves DOM state and enables multiple renderers.
- Lets React schedule work before committing.
