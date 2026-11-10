---
title: "What are Fragment refs in React 19.3?"
tags: ["react-19-3", "fragment", "refs", "dom", "observers"]
difficulty: "medium"
asked_as: ["Can a Fragment have a ref?", "How do you observe a group of elements without a wrapper div?", "What is a FragmentInstance?"]
---

## Short answer

Since **React 19.3**, you can put a `ref` on `<Fragment ref={ref}>`. The ref points to a **`FragmentInstance`**, an object that lets you work with the Fragment's DOM children **as a group**, without adding a wrapper `<div>` and without each child having to pass a ref along. You can add event listeners to all of them, move focus into the group, observe them with `IntersectionObserver` or `ResizeObserver`, and measure or scroll to them.

## Explanation

Before 19.3, if you wanted to watch "everything this component renders", you either added a wrapper `<div>` (which can break layout and HTML structure) or made every child forward a ref. Fragment refs remove both workarounds.

### What a `FragmentInstance` offers

| Group of methods | Methods | Works on |
| --- | --- | --- |
| Events | `addEventListener`, `removeEventListener`, `dispatchEvent` | First-level DOM children |
| Focus | `focus`, `focusLast`, `blur` | First focusable element, searching nested children depth-first |
| Observers | `observeUsing(observer)`, `unobserveUsing(observer)` | First-level DOM children |
| Layout | `getClientRects`, `getRootNode`, `compareDocumentPosition`, `scrollIntoView` | First-level DOM children |

The Fragment still doesn't create a DOM node; the ref is just a handle for its children. Listeners and observers you add also apply to children that mount later.

## Example

```jsx
import { Fragment, useEffect, useRef } from "react";

// Track which cards are visible, without wrapping them in a div
// (a wrapper would break the parent's CSS grid).
function VisibleTracker({ onVisible, children }) {
  const fragmentRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && onVisible(e.target));
    });
    fragmentRef.current.observeUsing(observer);
    return () => {
      fragmentRef.current?.unobserveUsing(observer);
      observer.disconnect();
    };
  }, [onVisible]);

  return <Fragment ref={fragmentRef}>{children}</Fragment>;
}

// Move focus into a dialog's content on open
function DialogBody({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.focus(); // focuses the first focusable child
  }, []);
  return <Fragment ref={ref}>{children}</Fragment>;
}
```

## Common mistakes

- Expecting a full DOM element. A `FragmentInstance` has only the methods listed above; there is no `style`, `classList` or `innerHTML`.
- Using `<>` with a ref. The short syntax takes no props; use `<Fragment ref={...}>`.
- Forgetting to clean up observers and listeners in the effect cleanup.
- Assuming it works on React versions before 19.3. On older versions, use a wrapper element or forward refs.

## Follow-up questions

- **Why not just add a `div`?** A wrapper changes layout (flex and grid items), can break HTML rules (`<tr>`, `<li>`), and adds DOM nodes.
- **Which children does it see?** Event and observer methods apply to the first-level host (DOM) children. Focus searches deeper.
- **Where is this useful?** Visibility and impression tracking, focus management in design systems, and measuring lists.

## Quick recap

- React 19.3 lets `<Fragment>` take a `ref`.
- The ref is a `FragmentInstance` that works on the Fragment's DOM children as a group.
- It supports events, focus, observers and layout methods.
- No wrapper `<div>` and no ref forwarding are needed.
