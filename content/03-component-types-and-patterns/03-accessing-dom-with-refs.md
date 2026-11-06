---
title: "How can we directly access DOM in React? (Refs)"
tags: ["refs", "dom", "useRef", "forwardRef"]
difficulty: "easy"
---

## Short answer

You access a DOM node with a **ref**: create one with `useRef(null)`, attach it with `ref={myRef}`, and after React commits the element, `myRef.current` points to the real DOM node. Use it in effects or event handlers, never during render. In React 19, function components can receive `ref` as a normal prop, so `forwardRef` is no longer needed.

## Explanation

React normally manages the DOM for you, the way a building manager handles the wiring. A ref is the spare key you keep for the few jobs React cannot express declaratively:

- Focusing, selecting or scrolling an element.
- Measuring size or position (`getBoundingClientRect`).
- Playing/pausing media.
- Integrating non-React libraries (charts, maps, editors).

### Ways to get a ref

| API | Use it for |
|---|---|
| `useRef(null)` | The standard way in function components |
| Callback ref `ref={(node) => ...}` | Running code when the node attaches/detaches, or refs in a list |
| `createRef()` | Class components |
| `ref` prop (React 19) / `forwardRef` (React 18) | Passing a ref through your own component to an inner DOM node |
| `useImperativeHandle` | Exposing a limited API (e.g. only `focus()`) instead of the whole node |

### Timing

`ref.current` is `null` during the first render. React sets it during the commit phase, before `useLayoutEffect` and `useEffect` run, and sets it back to `null` on unmount. In React 19 a callback ref can return a cleanup function.

## Example

```jsx
import { useRef, useEffect } from "react";

// React 19: ref is a regular prop on function components
function TextInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

export default function SearchBox() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.focus(); // safe: DOM is committed
  }, []);

  return (
    <>
      <TextInput ref={inputRef} placeholder="Search..." />
      <button onClick={() => inputRef.current.select()}>Select text</button>
      <div
        ref={(node) => {
          if (!node) return;
          const observer = new ResizeObserver(() => console.log(node.offsetWidth));
          observer.observe(node);
          return () => observer.disconnect(); // React 19 ref cleanup
        }}
      >
        Resizable box
      </div>
    </>
  );
}
```

## Common mistakes

- Reading or writing `ref.current` during render. Render must be pure; refs are for effects and handlers.
- Using refs to change what React renders (e.g. `node.textContent = ...` on a React-managed element). React will overwrite or conflict with it.
- Expecting a ref change to re-render. Updating `ref.current` never triggers a render.
- Using `document.getElementById` instead of refs; it breaks with multiple instances and portals.

## Follow-up questions

- **What else is `useRef` used for?** Storing any mutable value that survives renders without causing them: timer IDs, previous values, `AbortController`s.
- **How do you hold refs for a list of items?** Use a callback ref that stores nodes in a `Map` kept in a ref, keyed by item ID.
- **Why use `useImperativeHandle`?** To expose a small, intentional API (`focus`, `scrollToTop`) instead of leaking the entire DOM node to the parent.

## Quick recap

- `useRef` + `ref={...}` gives you the real DOM node in `.current`.
- Only touch it in effects or event handlers.
- React 19: `ref` is a normal prop; `forwardRef` is legacy.
- Refs are an escape hatch, not the default way to update UI.
