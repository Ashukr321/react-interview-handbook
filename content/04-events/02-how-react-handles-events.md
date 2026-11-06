---
title: "How does React handle events?"
asked_as: ["How react handle Event?"]
tags: ["events", "synthetic-events", "delegation", "internals"]
difficulty: "medium"
---

## Short answer

React does not attach a listener to each element. When you create a root, React attaches **one listener per event type to the root container** (both capture and bubble phases). When a native event reaches the root, React finds the fiber for `event.target`, collects the matching `onX`/`onXCapture` props along the fiber path, wraps the native event in a **SyntheticEvent**, and calls your handlers in order. State updates inside are **batched** and scheduled with a priority based on the event type.

## Explanation

React acts like a switchboard operator. All calls (native events) come into one switchboard (the root), and the operator looks up who should get the call by walking the component tree, not the DOM.

```text
User clicks <button>
   |
Native event: capture phase window -> ... -> root -> ... -> button
   |  (React's root capture listener runs onClickCapture handlers, top-down)
   |
Native event: bubble phase button -> ... -> root
   |  (React's root bubble listener runs onClick handlers, bottom-up)
   |
Handlers call setState -> updates batched, priority = Discrete (SyncLane)
   |
Render -> Commit -> Effects
```

### Key details

- **Root, not document**: since React 17, listeners live on the root container (`createRoot(container)`), so multiple React versions/apps on one page do not interfere.
- **Fiber path, not DOM path**: propagation follows the React tree, so events from a **portal** bubble to the React parent even though the DOM node lives elsewhere.
- **Synthetic events** normalize browser differences and expose `stopPropagation()`, `preventDefault()`, `nativeEvent`.
- **No event pooling** since React 17: you can read the event asynchronously.
- **Batching**: multiple `setState` calls in one handler cause one re-render (and in React 18+ also in timeouts, promises and native handlers).
- **Priority**: clicks and key presses are discrete (highest); mousemove/scroll are continuous; this decides the lane used by the scheduler.
- `onChange` for inputs fires on every keystroke (it listens to `input` and others under the hood).
- `onScroll` does not bubble in React 17+, matching the browser.

## Example

```jsx
import { useState } from "react";
import { createPortal } from "react-dom";

export default function Panel() {
  const [log, setLog] = useState([]);
  const add = (msg) => setLog((l) => [...l, msg]);

  return (
    <div onClickCapture={() => add("div capture")} onClick={() => add("div bubble")}>
      <button onClick={(e) => { add(`button (${e.type}, native: ${e.nativeEvent.constructor.name})`); }}>
        Click me
      </button>
      {createPortal(
        <button onClick={() => add("portal button")}>Portal</button>,
        document.body // DOM is outside the div, but React bubbling still reaches the div
      )}
      <ol>{log.map((m, i) => <li key={i}>{m}</li>)}</ol>
    </div>
  );
}
```

## Common mistakes

- Believing React adds a DOM listener to every element with `onClick`.
- Expecting `e.stopPropagation()` in React to stop a native listener on the same element; native listeners on inner elements already ran during their own bubble phase.
- Returning `false` to prevent default. You must call `e.preventDefault()`.
- Forgetting that portal events bubble through the React tree, triggering parent handlers unexpectedly.

## Follow-up questions

- **Why did React 17 move listeners from `document` to the root?** To allow gradual upgrades and multiple React roots/versions on a page, and to make `stopPropagation` interop with non-React code more predictable.
- **How do you attach a listener React does not support (e.g. on `window`)?** Use `addEventListener` in `useEffect` and remove it in cleanup.

## Quick recap

- One listener per event type on the root container, capture and bubble.
- React walks the fiber tree and calls handlers with a SyntheticEvent.
- Portals bubble through the React tree.
- Updates are batched and prioritised by event type.
