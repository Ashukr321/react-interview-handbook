---
title: "Difference between native event and synthetic event"
tags: ["events", "synthetic-events", "dom"]
difficulty: "medium"
---

## Short answer

A **native event** is the browser's own `Event` object, delivered to listeners added with `addEventListener`. A **synthetic event** is React's wrapper around it, delivered to JSX handlers like `onClick`. The synthetic event has the same core API, but it is dispatched by React from the root container along the **component tree**, is normalized across browsers, and exposes the original as `e.nativeEvent`.

## Explanation

The native event is the original letter; the synthetic event is the same letter put in a standard React envelope so every handler opens it the same way.

| Aspect | Native event | Synthetic event |
|---|---|---|
| Created by | Browser | React (wrapping native) |
| Attached with | `addEventListener` | JSX props (`onClick`, `onChange`) |
| Where listener lives | The element you choose | Root container (delegation) |
| Propagation path | DOM tree | React fiber tree (portals bubble to React parent) |
| Naming | lowercase `click` | camelCase `onClick` |
| `onChange` meaning | Fires on commit/blur for text inputs | Fires on every input change |
| Cleanup | Manual `removeEventListener` | Automatic on unmount |
| Passive by default | Only for some events on window/document/body in some browsers | `touchstart`, `touchmove`, `wheel` registered passive at root |
| Pooling | N/A | Removed in React 17 |
| Access the other | N/A | `e.nativeEvent` |

### When you need native listeners

- Events on `window`, `document` or elements outside React.
- Non-passive `wheel`/`touchmove` where you must call `preventDefault()`.
- Events React does not support as props.
- Fine-grained options such as `{ once: true }` or `signal` for removal.

### Mixing them

Native listeners on inner elements run **before** React's bubble handlers, because React's listener is on the root. If such a native listener calls `stopPropagation()`, React handlers never fire. Conversely, React's `e.stopPropagation()` stops propagation from the root upward, so `document` listeners will not see it.

## Example

```jsx
import { useEffect, useRef } from "react";

export default function Zoomable() {
  const boxRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    // Native, non-passive: can block page scroll while zooming
    const onWheel = (e) => {
      if (e.ctrlKey) e.preventDefault();
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={boxRef}
      // Synthetic: fine for reading data; preventDefault here would be ignored (passive)
      onWheel={(e) => console.log("deltaY", e.deltaY, e.nativeEvent instanceof WheelEvent)}
      style={{ height: 200, overflow: "auto" }}
    >
      Scroll or ctrl+wheel here
    </div>
  );
}
```

## Common mistakes

- Mixing a native `stopPropagation()` on an inner node with React handlers on ancestors, then debugging "my onClick never fires".
- Forgetting to remove native listeners, causing leaks and duplicates in Strict Mode.
- Calling `preventDefault()` inside React's `onWheel`/`onTouchMove` and expecting it to block scrolling.

## Follow-up questions

- **Can you call `stopPropagation` on `e.nativeEvent`?** Yes, but by then the native event has already reached the root, so it only affects listeners above the root.
- **Is a synthetic event slower?** The overhead is tiny; delegation usually makes React's approach cheaper overall.

## Quick recap

- Native = browser object, `addEventListener`, DOM path.
- Synthetic = React wrapper, JSX props, React tree path, root delegation.
- Use native for window/document, non-passive or unsupported events.
- `e.nativeEvent` bridges the two.
