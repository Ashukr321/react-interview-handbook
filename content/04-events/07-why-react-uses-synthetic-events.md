---
title: "Why does React use synthetic events?"
tags: ["events", "synthetic-events", "internals", "design"]
difficulty: "medium"
---

## Short answer

React uses synthetic events to get **one consistent, cross-browser event API**, to make **delegation at the root** possible (one listener per event type instead of thousands), to make propagation follow the **component tree** (including portals), and to let React **batch and prioritise** state updates based on which event triggered them. It also allows React to support the same event model on other renderers and to add or emulate events the DOM lacks.

## Explanation

Think of an airport's central security checkpoint. Instead of every gate running its own checks (a listener per element), everyone goes through one checkpoint (the root), which applies the same rules and then sends people to the right gate (your handler).

### The reasons, one by one

1. **Cross-browser consistency**
   Historically browsers disagreed on event properties (`which` vs `keyCode` vs `key`, `srcElement` vs `target`). The wrapper normalizes them so your code does not branch per browser.

2. **Performance through delegation**
   React attaches listeners once at the root. Adding or removing components does not add or remove DOM listeners; React just updates which props it will call.

3. **Component-tree semantics**
   Because React dispatches events itself, it can bubble a click inside a `createPortal` modal up to the React parent that rendered it, even though the DOM node is in `document.body`.

4. **Scheduling and batching**
   React knows when a handler starts and ends, so it can batch every `setState` inside into one render, and assign a priority lane (click = discrete/urgent, mousemove = continuous) that feeds the concurrent scheduler.

5. **Normalized semantics**
   `onChange` fires on every keystroke for all inputs, `onMouseEnter` works with delegation, `onFocus`/`onBlur` bubble. These would need extra code with raw DOM events.

6. **Automatic cleanup**
   Handlers disappear when components unmount; there is no listener to forget to remove.

### What changed over time

| Version | Change |
|---|---|
| React 16 | Listeners on `document`; event pooling (events reused, nulled after handler) |
| React 17 | Listeners on root container; pooling removed; `onScroll` stops bubbling; `onFocus`/`onBlur` use `focusin`/`focusout` |
| React 18 | Automatic batching everywhere; event priority drives lanes in concurrent rendering |

## Example

```jsx
import { useState } from "react";
import { createPortal } from "react-dom";

export default function Card() {
  const [clicks, setClicks] = useState(0);
  const [lastKey, setLastKey] = useState("");

  return (
    // One root listener handles all of these; portal clicks still bubble here
    <div onClick={() => setClicks((c) => c + 1)}>
      <p>Clicks inside card (including modal): {clicks}</p>
      <input onKeyDown={(e) => setLastKey(e.key)} placeholder="Type" />
      <p>Last key: {lastKey}</p>
      {createPortal(<button>Modal button</button>, document.body)}
    </div>
  );
}
```

## Common mistakes

- Saying synthetic events exist "because the DOM is slow". The main reasons are consistency, delegation and scheduling control.
- Assuming synthetic events are still pooled and calling `e.persist()` everywhere.
- Believing React handlers run before all native listeners; native listeners on inner elements run first in the bubble phase.

## Follow-up questions

- **Do modern browsers still need normalization?** Much less than in the IE era, but React still relies on the wrapper for delegation, tree-based propagation and priorities.
- **What do portals have to do with synthetic events?** Since React dispatches along the fiber tree, portal events bubble to React ancestors, not DOM ancestors.
- **Could React drop synthetic events?** The wrapper could get thinner, but the dispatch system is what enables batching and priorities, so the concept remains.

## Quick recap

- Consistent API across browsers.
- Delegation at the root: fewer listeners, automatic cleanup.
- Propagation follows the component tree (portals).
- Lets React batch updates and assign priorities.
