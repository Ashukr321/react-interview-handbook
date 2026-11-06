---
title: "What are React portals and when would you use them?"
tags: ["portals", "modals", "dom"]
difficulty: "medium"
---

## Short answer

A portal, created with `createPortal(children, domNode)` from `react-dom`, renders children into a **different DOM node** outside the parent component's DOM hierarchy while keeping them in the same **React tree**. Use portals for modals, tooltips, dropdowns, toasts and popovers that must escape a parent's `overflow: hidden`, `z-index` stacking context or CSS transforms.

## Explanation

A portal is like a teleporter: the component physically appears somewhere else in the page, but it still belongs to its original family. It keeps access to props, state and context, and its events bubble up to React ancestors.

```text
 React tree:                 DOM tree:
 App                         body
  +- Card                     +- div#root
      +- Modal (portal)       |    +- div.card  (overflow: hidden)
                              +- div#modal-root
                                   +- div.modal   <- rendered here
```

### What stays the same

- Context from providers above `Card` is available inside the modal.
- Events inside the portal bubble to `Card`'s handlers (React tree propagation).

### What changes

- CSS positioning and stacking are relative to the target node, not the parent.
- DOM queries like `parent.contains(modalNode)` return `false`.

### Accessibility checklist

Portals solve layout, not accessibility. A modal still needs `role="dialog"`, `aria-modal="true"`, focus trapping, `Escape` to close, and focus returned to the trigger. The native `<dialog>` element with `showModal()` uses the browser's top layer and covers many of these needs; libraries like Radix UI handle the rest.

## Example

```jsx
import { useState } from "react";
import { createPortal } from "react-dom";

function Modal({ onClose, children }) {
  return createPortal(
    <div className="backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}

export default function Card() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ overflow: "hidden" }}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)}>Hello from a portal</Modal>}
    </div>
  );
}
```

## Common mistakes

- Being surprised that a click inside the portal triggers a parent's `onClick`. It bubbles through the React tree; stop it if needed.
- Calling `document.getElementById` for the target during SSR, where `document` does not exist. Render portals only on the client.
- Forgetting focus management and keyboard handling.
- Creating a new container node on every render instead of reusing one.

## Follow-up questions

- **Do portals work with context?** Yes. Context flows through the React tree, not the DOM tree.
- **Can you use portals to render into another window or iframe?** Yes, by passing a DOM node from that document, as long as it is in the same JS realm.
- **Portal vs `<dialog>`?** `<dialog>` with `showModal()` uses the top layer, solving z-index natively; portals are still useful for tooltips, toasts and custom overlays.

## Quick recap

- `createPortal` renders into another DOM node.
- The component stays in the same React tree (context, events).
- Ideal for modals, tooltips, toasts and dropdowns.
- Still handle focus, ARIA and keyboard access.
