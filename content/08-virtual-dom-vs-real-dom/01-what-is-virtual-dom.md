---
title: "What is the Virtual DOM?"
tags: ["virtual-dom", "react-elements", "basics"]
difficulty: "easy"
---

## Short answer

The Virtual DOM is an in-memory, lightweight JavaScript description of what the UI should look like. In React it's made of **React elements**: plain objects like `{ type: "button", props: { children: "Save" } }` returned by your components. React compares the new description with what's currently rendered and applies only the differences to the real DOM.

## Explanation

When you write JSX, it compiles to function calls that create objects:

```jsx
// You write
<button className="primary">Save</button>

// Compiles to (automatic JSX runtime)
jsx("button", { className: "primary", children: "Save" });

// Which returns roughly
{
  $$typeof: Symbol.for("react.transitional.element"), // "react.element" before React 19
  type: "button",
  key: null,
  props: { className: "primary", children: "Save" }
}
```

These objects are cheap to create and throw away. They have no layout, no styles, no event listeners, just a description.

Analogy: an architect's blueprint versus the actual building. Editing the blueprint is cheap; demolishing walls is expensive. React edits the blueprint first and only sends the builders to change what really differs.

### How React actually uses it

| Piece | Role |
|---|---|
| React elements | Immutable description returned by components each render |
| Fiber tree | React's mutable internal tree that tracks instances, state and pending work |
| Reconciliation | Diff new elements against the current fiber tree |
| Renderer (`react-dom`) | Applies the resulting changes to the real DOM in the commit phase |

The term "Virtual DOM" is mostly a mental model. The React team itself prefers talking about elements, fibers and reconciliation, because React's element tree isn't a mirror of the DOM: it includes components, fragments, context providers and Suspense boundaries that never become DOM nodes.

```text
state change -> components return new elements (Virtual DOM)
             -> reconcile with current fibers -> list of changes
             -> commit: minimal real DOM operations
```

## Example

```jsx
import { useState } from "react";

export default function Greeting() {
  const [name, setName] = useState("Ada");

  // Every render creates a fresh element tree like:
  // { type: "div", props: { children: [ {type:"h1",...}, {type:"button",...} ] } }
  // Only the h1's text node changes in the real DOM when you click.
  return (
    <div>
      <h1>Hello, {name}</h1>
      <button onClick={() => setName("Grace")}>Change</button>
    </div>
  );
}
```

## Common mistakes

- Saying the Virtual DOM is a "copy of the real DOM". It's a description of desired UI, including non-DOM things like components.
- Thinking React keeps two full Virtual DOM trees and diffs them. Modern React diffs new elements against the fiber tree.
- Claiming the Virtual DOM is a browser feature. It's purely a library-level JavaScript concept.

## Follow-up questions

- **Is the Virtual DOM unique to React?** No. Vue, Preact and Inferno use one; Svelte and Solid avoid it with compile-time or fine-grained reactivity.
- **What is `$$typeof` for?** It marks objects as genuine React elements, a security measure against JSON injection, since Symbols can't be serialized.
- **Does React Native use a Virtual DOM?** It uses the same element/fiber model, but the host is native views instead of DOM nodes.

## Quick recap

- Virtual DOM = JS objects describing the UI.
- In React, those objects are React elements created by JSX.
- React diffs them against the current fiber tree.
- Only the differences reach the real DOM.
