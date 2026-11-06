---
title: "How does event delegation work in React?"
tags: ["events", "delegation", "internals", "react-17"]
difficulty: "medium"
---

## Short answer

When you call `createRoot(container)`, React registers a listener for **every supported event type** on that container, once for the capture phase and once for bubble. Your `onClick` props are never attached to DOM nodes. When a native event reaches the container, React looks up the fiber of `event.target`, walks up the fiber tree collecting matching handler props, and calls them in order with a synthetic event. Since React 17 the delegation target is the root container, not `document`.

## Explanation

React is like a hotel concierge: guests (DOM nodes) never get their own phone line. All calls come to the front desk (root), which checks the guest registry (fiber tree) and forwards the message.

### Step by step

```text
createRoot(#root)
  -> listenToAllSupportedEvents(#root)
     addEventListener("click", dispatch, true)   // capture
     addEventListener("click", dispatch, false)  // bubble
     ... for every event type (non-delegated ones like scroll handled separately)

User clicks <span> inside <button onClick={a}> inside <div onClick={b}>
  -> native event bubbles to #root
  -> React: targetFiber = fiber of <span>
  -> walk up: span (no handler) -> button (a) -> div (b)
  -> create SyntheticEvent, call a(e), then b(e) unless stopped
  -> setState calls inside are batched with discrete priority
```

### Why the root and not `document` (React 17 change)

- Multiple React apps or versions on one page each manage only their own root.
- `e.stopPropagation()` in React now actually stops events from reaching `document` listeners (useful with jQuery or other libraries).
- Easier micro-frontend and gradual upgrade stories.

### Events not delegated

A few events do not bubble reliably, so React attaches them directly to the element: e.g. `scroll`, media events (`play`, `pause`, `ended`), `load`/`error` on images, `toggle`, `cancel`/`close` on dialogs.

## Example

```jsx
import { createRoot } from "react-dom/client";

function List() {
  // 1,000 rows, but zero DOM listeners on the rows themselves
  const rows = Array.from({ length: 1000 }, (_, i) => i);
  return (
    <ul>
      {rows.map((i) => (
        <li key={i} onClick={() => console.log("row", i)}>Row {i}</li>
      ))}
    </ul>
  );
}

const container = document.getElementById("root");
createRoot(container).render(<List />);

// In DevTools: getEventListeners(container) shows React's listeners;
// getEventListeners(document.querySelector("li")) shows none.
```

## Common mistakes

- Optimizing by "delegating manually" in React (one `onClick` on the `<ul>` reading `data-id`) assuming each `onClick` costs a DOM listener. It does not; do it only if handler creation itself shows up in profiling.
- Expecting `document.addEventListener("click")` to run before React handlers. It runs after (bubble reaches root first).
- Forgetting that two separate `createRoot` calls mean two separate delegation roots; events do not cross between them.

## Follow-up questions

- **How does React find the fiber from a DOM node?** React stores an internal key (like `__reactFiber$...`) on each DOM node it creates and reads it from `event.target`.
- **What happens with portals?** The portal container also gets listeners, and the fiber walk follows the React tree, so events bubble to the portal's React parent.
- **Does `stopPropagation` in a React handler stop other React handlers?** Yes, those higher in the fiber path, and native propagation beyond the root.

## Quick recap

- React listens once per event type on the root container, capture and bubble.
- It maps `event.target` to a fiber and walks up collecting handlers.
- React 17 moved delegation from `document` to the root.
- Some non-bubbling events are attached directly to elements.
